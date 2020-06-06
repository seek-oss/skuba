import { createExec, ensureCommands } from '../../utils/exec';
import { showLogo } from '../../utils/logo';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template';

import { copyTemplate } from './copyTemplates';
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

  await copyTemplate(destinationDir, destinationDir, templateData);

  // prefer skuba /template/base files
  await copyTemplate(BASE_TEMPLATE_DIR, destinationDir, templateData);

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
    exec(
      'yarn',
      'add',
      '--dev',
      '--exact',
      '--ignore-optional',
      '--silent',
      'skuba',
    ),
  ]);

  console.log(`Created '${destinationDir}'!`);
};
