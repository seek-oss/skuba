import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import { NormalizedReadResult } from 'read-pkg-up';

import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { log } from '../../utils/logging.js';
import {
  TemplateConfig,
  ensureTemplateConfigDeletion,
} from '../../utils/template.js';
import { hasStringProp } from '../../utils/validation.js';
import { getTemplateConfig, runForm } from '../init/getConfig.js';

import { formatObject } from './processing/json.js';

interface Props {
  destinationRoot: string;
  include: (pathname: string) => boolean;
  manifest: NormalizedReadResult;
}

export const ensureTemplateCompletion = async ({
  destinationRoot,
  include,
  manifest,
}: Props): Promise<TemplateConfig> => {
  const templateConfig = getTemplateConfig(destinationRoot);

  if (templateConfig.fields.length === 0) {
    return templateConfig;
  }

  const templateName = hasStringProp(manifest.packageJson.skuba, 'template')
    ? manifest.packageJson.skuba.template
    : 'template';

  log.newline();
  const templateData = await runForm({
    choices: templateConfig.fields,
    message: chalk.bold(`Complete ${chalk.cyan(templateName)}:`),
    name: 'customAnswers',
  });

  const updatedPackageJson = formatObject(manifest.packageJson);
  const packageJsonFilepath = path.join(destinationRoot, 'package.json');
  await fs.writeFile(packageJsonFilepath, updatedPackageJson);

  await copyFiles({
    sourceRoot: destinationRoot,
    destinationRoot,
    include,
    processors: [createEjsRenderer(templateData)],
  });

  await ensureTemplateConfigDeletion(destinationRoot);

  log.newline();
  log.ok('Templating complete!');

  return templateConfig;
};
