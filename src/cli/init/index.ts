import path from 'path';

import { commitAllChanges } from '../../api/git';
import { copyFiles, createEjsRenderer } from '../../utils/copy';
import { createInclusionFilter } from '../../utils/dir';
import { createExec, ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogoAndVersionInfo } from '../../utils/logo';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template';
import { tryPatchRenovateConfig } from '../configure/patchRenovateConfig';

import { getConfig } from './getConfig';
import { initialiseRepo } from './git';
import { writePackageJson } from './writePackageJson';

export const init = async () => {
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
    // base template has files like _.eslintrc.js
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
    streamStdio: packageManager === 'yarn' ? 'yarn' : true,
  });

  log.newline();
  await initialiseRepo(destinationDir, templateData);

  // Patch in a baseline Renovate preset based on the configured Git owner.
  await tryPatchRenovateConfig(destinationDir);

  const skubaSlug = `skuba@${skubaVersionInfo.local}`;

  let depsInstalled = false;
  try {
    // The `-D` shorthand is portable across our package managers.
    await exec(packageManager, 'add', '-D', skubaSlug);
    depsInstalled = true;
  } catch {}

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
    log.ok('git add --all');
    log.ok('git commit --message', `'Pin ${skubaSlug}'`);
    log.ok('git push --set-upstream origin master');

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
  log.ok('git push --set-upstream origin master');

  log.newline();
};
