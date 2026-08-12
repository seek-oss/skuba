import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import {
  hasDebugFlag,
  hasHelpFlag,
  hasNonInteractiveFlag,
} from '../../utils/args.js';
import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { createInclusionFilter, findWorkspaceRoot } from '../../utils/dir.js';
import { createExec, ensureCommands } from '../../utils/exec.js';
import { pathExists } from '../../utils/fs.js';
import { createLogger, log } from '../../utils/logging.js';
import { showLogoAndVersionInfo } from '../../utils/logo.js';
import { getConsumerManifest } from '../../utils/manifest.js';
import { detectPackageManager } from '../../utils/packageManager.js';
import {
  BASE_TEMPLATE_DIR,
  TEMPLATE_CONFIG_FILENAME,
  ensureTemplateConfigDeletion,
} from '../../utils/template.js';
import { runPrettier } from '../adapter/prettier.js';
import { patchPnpmWorkspace } from '../lint/internalLints/patchPnpmWorkspace.js';
import { tryPatchRenovateConfig } from '../lint/internalLints/patchRenovateConfig.js';

import { getConfig } from './getConfig.js';
import { initialiseRepo } from './git.js';
import { logInitHelp } from './help.js';
import { confirmExistingRepo } from './prompts.js';
import { resumeTemplating } from './resumeTemplating.js';
import type { Input } from './types.js';
import {
  type RegisterWorkspaceResult,
  registerWorkspaceProject,
} from './workspace.js';
import { writePackageJson } from './writePackageJson.js';

import * as Git from '@skuba-lib/api/git';

export const init = async (args = process.argv.slice(2)) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
  };

  // Force reading from stdin when `--non-interactive` is passed, otherwise fall
  // back to whether stdin is a TTY.
  const nonInteractive = hasNonInteractiveFlag(args) || !process.stdin.isTTY;

  const skubaVersionInfo = await showLogoAndVersionInfo();

  if (hasHelpFlag(args)) {
    logInitHelp();
    return;
  }

  const consumerManifest = await getConsumerManifest();
  if (
    consumerManifest &&
    (await pathExists(
      path.join(path.dirname(consumerManifest.path), TEMPLATE_CONFIG_FILENAME),
    ))
  ) {
    await resumeTemplating({ manifest: consumerManifest, nonInteractive });
    return;
  }

  // When run inside an existing repo/workspace, scaffold as an additional
  // project (a package, or an app like a Lambda worker or API) rather than a
  // standalone repo. `findWorkspaceRoot` considers the Git root among its
  // candidates, so a non-null result also covers a plain Git repo.
  //
  // The detection is location-based, so an ancestor repo (e.g. `$HOME`) would
  // otherwise silently switch modes; confirm with the user before doing so.
  // In non-interactive mode we can't prompt, so detection stands on its own.
  const cwd = process.cwd();
  const detectedWorkspaceRoot = await findWorkspaceRoot(cwd);

  let workspaceRoot = detectedWorkspaceRoot;
  if (detectedWorkspaceRoot && !nonInteractive) {
    const confirmed = await confirmExistingRepo(detectedWorkspaceRoot);
    if (!confirmed) {
      workspaceRoot = null;
    }
  }
  const existingRepo = workspaceRoot !== null;

  const {
    destinationDir,
    entryPoint,
    packageManager,
    templateComplete,
    templateData,
    templateName,
    type,
  } = await getConfig({ nonInteractive });

  await ensureCommands(packageManager);

  const include = await createInclusionFilter([
    path.join(destinationDir, '.gitignore'),
    path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
  ]);

  const processors = [createEjsRenderer(templateData)];

  // In an existing repo these are inherited from the workspace root, so avoid
  // scaffolding duplicate copies into the new package.
  const ROOT_OWNED_FILES = new Set([
    '.gitignore',
    '.prettierignore',
    '.prettierrc.js',
    'eslint.config.js',
    '.dockerignore',
    'renovate.json5',
  ]);
  const includeBaseFile = (pathname: string) =>
    include(pathname) &&
    !(existingRepo && ROOT_OWNED_FILES.has(path.basename(pathname)));

  await copyFiles({
    sourceRoot: BASE_TEMPLATE_DIR,
    destinationRoot: destinationDir,
    include: includeBaseFile,
    // prefer template-specific files
    overwrite: false,
    processors,
    // base template has files like _eslint.config.js
    stripUnderscorePrefix: true,
  });

  await copyFiles({
    sourceRoot: destinationDir,
    destinationRoot: destinationDir,
    include,
    processors,
  });

  await Promise.all([
    templateComplete
      ? ensureTemplateConfigDeletion(destinationDir)
      : Promise.resolve(),

    writePackageJson({
      cwd: destinationDir,
      entryPoint,
      template: templateName,
      type,
      version: skubaVersionInfo.local,
    }),
  ]);

  log.newline();
  if (!existingRepo) {
    await initialiseRepo(destinationDir, templateData);
  }

  const manifest = await getConsumerManifest(destinationDir);

  if (!manifest) {
    throw new Error("Repository doesn't contain a package.json file.");
  }

  const exec = createExec({
    cwd: destinationDir,
    stdio: 'pipe',
    streamStdio: packageManager,
  });

  let workspaceRegistration: RegisterWorkspaceResult | undefined;

  if (workspaceRoot) {
    // The root owns `pnpm-workspace.yaml` and Renovate config; only pnpm
    // workspaces are supported, and a non-pnpm root yields a `manual` result
    // rather than a crash.
    workspaceRegistration = await registerWorkspaceProject({
      workspaceRoot,
      projectDir: path.resolve(destinationDir),
    });
  } else {
    if (packageManager === 'pnpm') {
      await fs.promises.writeFile(
        path.join(destinationDir, 'pnpm-workspace.yaml'),
        '',
        'utf8',
      );
      await patchPnpmWorkspace('format', destinationDir);
    }

    // Patch in a baseline Renovate preset based on the configured Git owner.
    await tryPatchRenovateConfig({
      mode: 'format',
      dir: destinationDir,
      manifest,
      packageManager: await detectPackageManager(destinationDir),
    });
  }

  const skubaSlug = `skuba@${skubaVersionInfo.local}`;

  let depsInstalled = false;
  try {
    // The `-D` shorthand is portable across our package managers.
    await exec(packageManager, 'add', '-D', skubaSlug);

    // Templating can initially leave certain files in an unformatted state;
    // consider a Markdown table with columns sized based on content length.
    await runPrettier(
      'format',
      createLogger({ debug: opts.debug }),
      destinationDir,
    );

    depsInstalled = true;
  } catch (err) {
    log.warn(inspect(err));
  }

  await Git.commitAllChanges({
    dir: path.resolve(destinationDir),
    message: `Clone ${templateName}`,
  });

  const logGitHubRepoCreation = () => {
    log.plain(
      'Next, create an empty',
      log.bold(`${templateData.orgName}/${templateData.repoName}`),
      'repository:',
    );
    log.ok('https://github.com/new');
  };

  const logWorkspaceRegistration = () => {
    if (
      !workspaceRegistration ||
      workspaceRegistration.outcome === 'already-covered'
    ) {
      return;
    }

    if (workspaceRegistration.outcome === 'registered') {
      log.plain(
        'Registered',
        log.bold(workspaceRegistration.entry),
        'in',
        log.bold(path.basename(workspaceRegistration.file)),
      );
      return;
    }

    log.warn(
      'Could not register the project automatically',
      `(${workspaceRegistration.reason}).`,
    );
    log.warn(
      'Add',
      log.bold(workspaceRegistration.entry),
      'to your workspace configuration manually.',
    );
  };

  if (!depsInstalled) {
    log.newline();
    log.warn(log.bold('✗ Failed to install dependencies.'));

    log.newline();
    if (existingRepo) {
      logWorkspaceRegistration();
    } else {
      logGitHubRepoCreation();
    }

    log.newline();
    log.plain('Then, resume initialisation:');
    log.ok('cd', destinationDir);
    // The `-D` shorthand is portable across our package managers.
    log.ok(packageManager, 'add', '-D', skubaSlug);
    log.ok(packageManager, 'run', 'format');
    log.ok('git add --all');
    log.ok('git commit --message', `'Pin ${skubaSlug}'`);
    if (!existingRepo) {
      log.ok(`git push --set-upstream origin ${templateData.defaultBranch}`);
    }

    log.newline();
    process.exitCode = 1;
    return;
  }

  log.newline();
  log.ok(log.bold('✔ Project initialised!'));

  if (existingRepo) {
    log.newline();
    logWorkspaceRegistration();

    // The initial commit only captures the new project's files; the root
    // manifest and lockfile changes are left for the user to review and commit.
    log.newline();
    log.plain(
      'The workspace root has uncommitted changes',
      '(updated lockfile and workspace config).',
    );
    log.plain('Review and commit them alongside the new project.');

    log.newline();
    log.plain('Your new project is ready:');
    log.ok('cd', destinationDir);
    log.ok(packageManager, 'run', 'lint');
  } else {
    log.newline();
    logGitHubRepoCreation();

    log.newline();
    log.plain('Then, push your local changes:');
    log.ok('cd', destinationDir);
    log.ok(`git push --set-upstream origin ${templateData.defaultBranch}`);
  }

  log.newline();
};
