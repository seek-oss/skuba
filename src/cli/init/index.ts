import path from 'path';
import { inspect } from 'util';

import { commitAllChanges } from '../../api/git';
import { hasDebugFlag } from '../../utils/args';
import { copyFiles, createEjsRenderer } from '../../utils/copy';
import { createInclusionFilter } from '../../utils/dir';
import { createExec, ensureCommands } from '../../utils/exec';
import { createLogger, log } from '../../utils/logging';
import { showLogoAndVersionInfo } from '../../utils/logo';
import { getConsumerManifest } from '../../utils/manifest';
import { detectPackageManager } from '../../utils/packageManager';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template';
import { runPrettier } from '../adapter/prettier';
import { tryPatchRenovateConfig } from '../lint/internalLints/patchRenovateConfig';

import { getConfig } from './getConfig';
import { initialiseRepo } from './git';
import type { Input } from './types';
import { writePackageJson } from './writePackageJson';

export const init = async (args = process.argv.slice(2)) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
  };

  const skubaVersionInfo = await showLogoAndVersionInfo();

  const {
    destinationDir,
    entryPoint,
    packageManager,
    templateComplete,
    templateData,
    templateName,
    type,
  } = await getConfig();

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

  log.newline();
  await initialiseRepo(destinationDir, templateData);

  const [manifest, packageManagerConfig] = await Promise.all([
    getConsumerManifest(destinationDir),
    detectPackageManager(destinationDir),
  ]);

  if (!manifest) {
    throw new Error("Repository doesn't contain a package.json file.");
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
    log.warn(inspect(err));
  }

  await commitAllChanges({
    dir: destinationDir,
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

  if (!depsInstalled) {
    log.newline();
    log.warn(log.bold('✗ Failed to install dependencies.'));

    log.newline();
    logGitHubRepoCreation();

    log.newline();
    log.plain('Then, resume initialisation:');
    log.ok('cd', destinationDir);
    // The `-D` shorthand is portable across our package managers.
    log.ok(packageManager, 'add', '-D', skubaSlug);
    log.ok(packageManager, 'run', 'format');
    log.ok('git add --all');
    log.ok('git commit --message', `'Pin ${skubaSlug}'`);
    log.ok(`git push --set-upstream origin ${templateData.defaultBranch}`);

    log.newline();
    process.exitCode = 1;
    return;
  }

  log.newline();
  log.ok(log.bold('✔ Project initialised!'));

  log.newline();
  logGitHubRepoCreation();

  log.newline();
  log.plain('Then, push your local changes:');
  log.ok('cd', destinationDir);
  log.ok(`git push --set-upstream origin ${templateData.defaultBranch}`);

  log.newline();
};
