import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import type { NormalizedReadResult } from 'read-pkg-up';

import { copyFiles, createEjsRenderer } from '../../utils/copy';
import { log } from '../../utils/logging';
import {
  type TemplateConfig,
  ensureTemplateConfigDeletion,
} from '../../utils/template';
import { hasStringProp } from '../../utils/validation';
import { getTemplateConfig, runForm } from '../init/getConfig';

import { formatPackage } from './processing/package';

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

  const updatedPackageJson = await formatPackage(manifest.packageJson);
  const packageJsonFilepath = path.join(destinationRoot, 'package.json');
  await fs.promises.writeFile(packageJsonFilepath, updatedPackageJson);

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
