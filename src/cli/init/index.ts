import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import { hasDebugFlag } from '../../utils/args.js';
import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { createInclusionFilter } from '../../utils/dir.js';
import { createExec, ensureCommands } from '../../utils/exec.js';
import { createLogger, log } from '../../utils/logging.js';
import { showLogoAndVersionInfo } from '../../utils/logo.js';
import { getConsumerManifest, getSkubaManifest } from '../../utils/manifest.js';
import { detectPackageManager } from '../../utils/packageManager.js';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template.js';
import { runPrettier } from '../adapter/prettier.js';
import { tryPatchRenovateConfig } from '../lint/internalLints/patchRenovateConfig.js';

import { getConfig } from './getConfig.js';
import { initialiseRepo } from './git.js';
import type { Input } from './types.js';
import { writePackageJson } from './writePackageJson.js';

import * as Git from '@skuba-lib/api/git';

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

  const [manifest, packageManagerConfig, skubaManifest] = await Promise.all([
    getConsumerManifest(destinationDir),
    detectPackageManager(destinationDir),
    getSkubaManifest(),
  ]);

  if (!manifest) {
    throw new Error("Repository doesn't contain a package.json file.");
  }

  const pnpmPluginSkubaVersion =
    skubaManifest.devDependencies?.['pnpm-plugin-skuba'] || 'latest';

  if (packageManager === 'pnpm') {
    if (process.env.SKUBA_INTEGRATION_TEST === 'true') {
      await fs.promises.symlink(
        path.resolve('../skuba/packages/pnpm-plugin-skuba/pnpmfile.cjs'),
        path.join(destinationDir, '.pnpmfile.cjs'),
      );
    } else {
      await exec(
        packageManager,
        'add',
        '--config',
        `pnpm-plugin-skuba@${pnpmPluginSkubaVersion}`,
        '--workspace',
      );
    }
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

  await Git.commitAllChanges({
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
