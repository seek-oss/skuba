import path from 'path';

import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { createInclusionFilter } from '../../utils/dir.js';
import { createExec, ensureCommands } from '../../utils/exec.js';
import { log } from '../../utils/logging.js';
import { showLogoAndVersionInfo } from '../../utils/logo.js';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template.js';

import { getConfig } from './getConfig.js';
import { commitChanges, initialiseRepo } from './git.js';
import { writePackageJson } from './writePackageJson.js';

export const init = async () => {
  const skubaVersionInfo = await showLogoAndVersionInfo();

  await ensureCommands('git', 'yarn');

  const {
    destinationDir,
    entryPoint,
    templateComplete,
    templateData,
    templateName,
    type,
  } = await getConfig();

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
    streamStdio: 'yarn',
  });

  log.newline();
  await initialiseRepo(exec, templateData);

  const skubaSlug = `skuba@${skubaVersionInfo.local}`;

  let depsInstalled = false;
  try {
    await exec('yarn', 'add', '--dev', skubaSlug);
    depsInstalled = true;
  } catch {}

  await commitChanges(exec, `Clone ${templateName}`);

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
    log.ok('yarn add --dev', skubaSlug);
    log.ok('git add --all');
    log.ok('git commit --message', `'Pin ${skubaSlug}'`);
    log.ok('git push --set-upstream origin master');

    log.newline();
    process.exit(1);
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
