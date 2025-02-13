import path from 'path';

import fs from 'fs-extra';
import { z } from 'zod';

import { projectTypeSchema } from './manifest';
import { packageManagerSchema } from './packageManager';

export const TEMPLATE_NAMES = [
  'express-rest-api',
  'greeter',
  'koa-rest-api',
  'lambda-sqs-worker-cdk',
  'oss-npm-package',
  'private-npm-package',
] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export const TEMPLATE_NAMES_WITH_BYO = [...TEMPLATE_NAMES, 'github →'] as const;

interface TemplateDocumentationConfig {
  /**
   * The semantic version in which the template was first added.
   *
   * This is used to filter out historical changelogs.
   */
  added: string;

  /**
   * The Markdown file for the template in our `/docs`.
   *
   * This is used to compile per-template changelogs for our documentation site.
   */
  filename: string;
}

export const TEMPLATE_DOCUMENTATION_CONFIG: Record<
  TemplateName,
  TemplateDocumentationConfig
> = {
  'express-rest-api': {
    added: '3.8.0',
    filename: 'api.md',
  },
  greeter: {
    added: '3.4.1',
    filename: 'barebones.md',
  },
  'koa-rest-api': {
    added: '3.4.1',
    filename: 'api.md',
  },
  'lambda-sqs-worker-cdk': {
    added: '3.13.0',
    filename: 'worker.md',
  },
  'oss-npm-package': {
    added: '3.7.0',
    filename: 'package.md',
  },
  'private-npm-package': {
    added: '3.6.0',
    filename: 'package.md',
  },
};

export type TemplateConfig = z.infer<typeof templateConfigSchema>;

export const templateConfigSchema = z.object({
  fields: z.array(
    z.object({
      name: z.string(),
      message: z.string(),
      initial: z.string(),
      validate: z
        .function()
        .args(z.string())
        .returns(z.union([z.boolean(), z.string()]))
        .optional(),
    }),
  ),
  entryPoint: z.string().optional(),
  noSkip: z.boolean().optional(),
  packageManager: packageManagerSchema,
  type: projectTypeSchema.optional(),
});

export const TEMPLATE_CONFIG_FILENAME = 'skuba.template.js';

export const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'template');

export const BASE_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'base');

export const ensureTemplateConfigDeletion = (dir: string): Promise<void> =>
  fs.promises.rm(path.join(dir, TEMPLATE_CONFIG_FILENAME));

export const readBaseTemplateFile = (src: string): Promise<string> =>
  fs.promises.readFile(path.join(BASE_TEMPLATE_DIR, src), 'utf8');
