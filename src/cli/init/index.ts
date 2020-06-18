import path from 'path';

import {
  copyFiles,
  createEjsRenderer,
  createInclusionFilter,
} from '../../utils/copy';
import { createExec, ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogo } from '../../utils/logo';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template';

import { getConfig } from './getConfig';
import { commitChanges, initialiseRepo } from './git';
import { writePackageJson } from './writePackageJson';

export const init = async () => {
  const skubaVersion = await showLogo();

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
    sourceRoot: destinationDir,
    destinationRoot: destinationDir,
    include,
    processors,
  });

  // prefer skuba /template/base files
  await copyFiles({
    sourceRoot: BASE_TEMPLATE_DIR,
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
      version: skubaVersion,
    }),
  ]);

  const exec = createExec({ cwd: destinationDir });

  log.newline();
  await initialiseRepo(exec, templateData);
  await exec('yarn', 'add', '--dev', '--exact', '--silent', 'skuba');
  await commitChanges(exec, `Clone ${templateName}`);

  log.newline();
  log.ok('✔ All done! Try running:');

  log.newline();
  log.ok(log.bold('cd', destinationDir));
  log.ok(log.bold('git push --set-upstream origin master'));
};
