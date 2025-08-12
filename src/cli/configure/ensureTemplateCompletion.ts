import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import type { ReadResult } from 'read-pkg-up';
import * as z from 'zod/v4';

import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { log } from '../../utils/logging.js';
import {
  type TemplateConfig,
  ensureTemplateConfigDeletion,
} from '../../utils/template.js';
import { hasStringProp } from '../../utils/validation.js';
import {
  getTemplateConfig,
  readJSONFromStdIn,
  runForm,
} from '../init/getConfig.js';

import { formatPackage } from './processing/package.js';

interface Props {
  destinationRoot: string;
  include: (pathname: string) => boolean;
  manifest: ReadResult;
}

const templateDataSchema = z.object({
  templateData: z.record(z.string(), z.string()),
});

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
