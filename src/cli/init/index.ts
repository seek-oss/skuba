import path from 'path';
import { inspect } from 'util';

import { log as clackLog, note, outro } from '@clack/prompts';
import fs from 'fs-extra';

import {
  hasDebugFlag,
  hasHelpFlag,
  hasNonInteractiveFlag,
} from '../../utils/args.js';
import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { createInclusionFilter } from '../../utils/dir.js';
import { createExec, ensureCommands } from '../../utils/exec.js';
import { pathExists } from '../../utils/fs.js';
import { createLogger } from '../../utils/logging.js';
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
import { resumeTemplating } from './resumeTemplating.js';
import type { Input } from './types.js';
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

  await copyFiles({
    sourceRoot: BASE_TEMPLATE_DIR,
    destinationRoot: destinationDir,
    include,
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

  const exec = createExec({
    cwd: destinationDir,
    stdio: 'pipe',
    streamStdio: packageManager,
  });

  await initialiseRepo(destinationDir, templateData);

  const [manifest, packageManagerConfig] = await Promise.all([
    getConsumerManifest(destinationDir),
    detectPackageManager(destinationDir),
  ]);

  if (!manifest) {
    throw new Error("Repository doesn't contain a package.json file.");
  }

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
    packageManager: packageManagerConfig,
  });

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
    clackLog.warn(inspect(err));
  }

  await Git.commitAllChanges({
    dir: destinationDir,
    message: `Clone ${templateName}`,
  });

  const repoSlug = `${templateData.orgName}/${templateData.repoName}`;

  if (!depsInstalled) {
    clackLog.error('Failed to install dependencies.');
    note(
      [
        `Create an empty ${repoSlug} repository:`,
        'https://github.com/new',
        '',
        'Then, resume initialisation:',
        `cd ${destinationDir}`,
        `${packageManager} add -D ${skubaSlug}`,
        `${packageManager} run format`,
        'git add --all',
        `git commit --message 'Pin ${skubaSlug}'`,
        `git push --set-upstream origin ${templateData.defaultBranch}`,
      ].join('\n'),
      'Next steps',
    );

    process.exitCode = 1;
    return;
  }

  note(
    [
      `Create an empty ${repoSlug} repository:`,
      'https://github.com/new',
      '',
      'Then, push your local changes:',
      `cd ${destinationDir}`,
      `git push --set-upstream origin ${templateData.defaultBranch}`,
    ].join('\n'),
    'Next steps',
  );
  outro('Project initialised!');
};
