import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import { NormalizedReadResult } from 'read-pkg-up';

import { copyFiles, createInclusionFilter } from '../../utils/copy';
import {
  BASE_TEMPLATE_DIR,
  TemplateConfig,
  ensureTemplateConfigDeletion,
} from '../../utils/template';
import { hasStringProp } from '../../utils/validation';
import { getTemplateConfig, runForm } from '../init/getConfig';

import { formatObject } from './processing/json';

interface Props {
  destinationRoot: string;
  manifest: NormalizedReadResult;
}

export const ensureTemplateCompletion = async ({
  destinationRoot,
  manifest,
}: Props): Promise<TemplateConfig> => {
  const templateConfig = getTemplateConfig(destinationRoot);

  if (templateConfig.fields.length === 0) {
    return templateConfig;
  }

  const templateName = hasStringProp(manifest.packageJson.skuba, 'template')
    ? manifest.packageJson.skuba.template
    : 'template';

  const templateData = await runForm({
    choices: templateConfig.fields,
    message: chalk.bold(`Complete ${chalk.cyan(templateName)}:`),
    name: 'customAnswers',
  });

  const updatedPackageJson = formatObject(manifest.packageJson);
  const packageJsonFilepath = path.join(destinationRoot, 'package.json');
  await fs.writeFile(packageJsonFilepath, updatedPackageJson);

  const include = await createInclusionFilter([
    path.join(destinationRoot, '.gitignore'),
    path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
  ]);

  await copyFiles({
    sourceRoot: destinationRoot,
    destinationRoot,
    include,
    templateData,
  });

  await ensureTemplateConfigDeletion(destinationRoot);

  console.log(chalk.green('Finished templating.'));

  return templateConfig;
};
