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

import { getTemplateConfig, runForm } from './getConfig.js';
import { readJSONFromStdIn } from './readJSONFromStdIn.js';

interface Props {
  manifest: ReadResult;

  /** Whether to read template data as JSON from stdin. */
  nonInteractive: boolean;
}

/**
 * Builds a schema for the template's remaining fields.
 *
 * Each field is required, described with its prompt message, and given its
 * initial value as an example. `readJSONFromStdIn` will dump this schema to the
 * console to inform users of the template-specific fields.
 */
const getTemplateDataSchema = (templateConfig: TemplateConfig) =>
  z.object({
    templateData: z
      .object(
        Object.fromEntries(
          templateConfig.fields.map(
            ({ name, message, initial }) =>
              [
                name,
                z.string().meta({
                  description: message,
                  examples: initial ? [initial] : undefined,
                }),
              ] as const,
          ),
        ),
      )
      .describe(
        "Values for the template's remaining fields, keyed by the field names declared in `skuba.template.js`.",
      ),
  });

const getTemplateDataFromStdIn = async (
  templateConfig: TemplateConfig,
): Promise<Record<string, string>> => {
  const data = await readJSONFromStdIn(getTemplateDataSchema(templateConfig));

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

export const resumeTemplating = async ({
  manifest,
  nonInteractive,
}: Props): Promise<void> => {
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
  const templateData = nonInteractive
    ? await getTemplateDataFromStdIn(templateConfig)
    : await runForm({
        choices: templateConfig.fields,
        message: styleText(
          'bold',
          `Complete ${styleText('cyan', templateName)}:`,
        ),
        name: 'customAnswers',
      });

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
