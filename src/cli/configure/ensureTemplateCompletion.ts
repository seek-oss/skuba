import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import type { NormalizedReadResult } from 'read-pkg-up';
import { z } from 'zod';

import { copyFiles, createEjsRenderer } from '../../utils/copy';
import { log } from '../../utils/logging';
import {
  type TemplateConfig,
  ensureTemplateConfigDeletion,
} from '../../utils/template';
import { hasStringProp } from '../../utils/validation';
import {
  getTemplateConfig,
  readJSONFromStdIn,
  runForm,
} from '../init/getConfig';

import { formatPackage } from './processing/package';

interface Props {
  destinationRoot: string;
  include: (pathname: string) => boolean;
  manifest: NormalizedReadResult;
}

const templateDataSchema = z.object({ templateData: z.record(z.string()) });

const getTemplateDataFromStdIn = async (
  templateConfig: TemplateConfig,
): Promise<Record<string, string>> => {
  const config = await readJSONFromStdIn();
  const data = templateDataSchema.parse(config);

  templateConfig.fields.forEach((field) => {
    const value = data.templateData[field.name];
    if (value === undefined) {
      throw new Error(`Missing field: ${field.name}`);
    }

    if (field.validate && !field.validate(value)) {
      throw new Error(`Invalid value for field: ${field.name}`);
    }
  });

  return data.templateData;
};

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
  const templateData = process.stdin.isTTY
    ? await runForm({
        choices: templateConfig.fields,
        message: chalk.bold(`Complete ${chalk.cyan(templateName)}:`),
        name: 'customAnswers',
      })
    : await getTemplateDataFromStdIn(templateConfig);

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
