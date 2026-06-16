import { styleText } from 'node:util';
import path from 'path';

import fs from 'fs-extra';
import * as z from 'zod/v4';

import { copyFiles, createEjsRenderer } from '../../utils/copy.js';
import { createInclusionFilter } from '../../utils/dir.js';
import { log } from '../../utils/logging.js';
import {
  BASE_TEMPLATE_DIR,
  type TemplateConfig,
  ensureTemplateConfigDeletion,
} from '../../utils/template.js';
import { hasStringProp } from '../../utils/validation.js';
import { formatPackage } from '../configure/processing/package.js';
import type { ReadResult } from '../configure/types.js';

import { getTemplateConfig, readJSONFromStdIn, runForm } from './getConfig.js';

interface Props {
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

export const resumeTemplating = async ({ manifest }: Props): Promise<void> => {
  const destinationRoot = path.dirname(manifest.path);

  const templateConfig = await getTemplateConfig(destinationRoot);

  if (templateConfig.fields.length === 0) {
    await ensureTemplateConfigDeletion(destinationRoot);
    return;
  }

  const templateName = hasStringProp(manifest.packageJson.skuba, 'template')
    ? manifest.packageJson.skuba.template
    : 'template';

  log.newline();
  const templateData = process.stdin.isTTY
    ? await runForm({
        choices: templateConfig.fields,
        message: styleText(
          'bold',
          `Complete ${styleText('cyan', templateName)}:`,
        ),
        name: 'customAnswers',
      })
    : await getTemplateDataFromStdIn(templateConfig);

  const updatedPackageJson = await formatPackage(manifest.packageJson);
  const packageJsonFilepath = path.join(destinationRoot, 'package.json');
  await fs.promises.writeFile(packageJsonFilepath, updatedPackageJson);

  const include = await createInclusionFilter([
    path.join(destinationRoot, '.gitignore'),
    path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
  ]);

  await copyFiles({
    sourceRoot: destinationRoot,
    destinationRoot,
    include,
    processors: [createEjsRenderer(templateData)],
  });

  await ensureTemplateConfigDeletion(destinationRoot);

  log.newline();
  log.ok('Templating complete!');
};
