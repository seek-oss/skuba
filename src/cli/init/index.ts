import path from 'path';

import { copyFiles, createInclusionFilter } from '../../utils/copy';
import { createExec, ensureCommands } from '../../utils/exec';
import { showLogo } from '../../utils/logo';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template';

import { getConfig } from './getConfig';
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
  } = await getConfig();

  console.log();

  const include = await createInclusionFilter([
    path.join(destinationDir, '.gitignore'),
    path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
  ]);

  await copyFiles({
    sourceRoot: destinationDir,
    destinationRoot: destinationDir,
    include,
    templateData,
  });

  // prefer skuba /template/base files
  await copyFiles({
    sourceRoot: BASE_TEMPLATE_DIR,
    destinationRoot: destinationDir,
    include,
    templateData,
  });

  await Promise.all([
    templateComplete
      ? ensureTemplateConfigDeletion(destinationDir)
      : Promise.resolve(),

    writePackageJson({
      cwd: destinationDir,
      entryPoint,
      template: templateName,
      version: skubaVersion,
    }),
  ]);

  const exec = createExec({ cwd: destinationDir });

  await Promise.all([
    exec('git', 'init'),
    exec('yarn', 'add', '--dev', '--exact', '--silent', 'skuba'),
  ]);

  console.log(`Created '${destinationDir}'!`);
};
