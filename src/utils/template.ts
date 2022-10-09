/* eslint-disable new-cap */

import path from 'path';

import fs from 'fs-extra';
import * as t from 'runtypes';

import { ProjectType } from './manifest';

export const TEMPLATE_NAMES = [
  'express-rest-api',
  'greeter',
  'koa-rest-api',
  'lambda-sqs-worker',
  'lambda-sqs-worker-cdk',
  'oss-npm-package',
  'private-npm-package',
] as const;

export type TemplateName = typeof TEMPLATE_NAMES[number];

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
  'lambda-sqs-worker': {
    added: '3.4.1',
    filename: 'worker.md',
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

export type TemplateConfig = t.Static<typeof TemplateConfig>;

export const TemplateConfig = t.Record({
  fields: t.Array(
    t.Record({
      name: t.String,
      message: t.String,
      initial: t.String,
      validate: t.Function.optional(),
    }),
  ),
  entryPoint: t.String.optional(),
  noSkip: t.Boolean.optional(),
  type: ProjectType.optional(),
});

export const TEMPLATE_CONFIG_FILENAME = 'skuba.template.cjs';

export const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'template');

export const BASE_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'base');

export const ensureTemplateConfigDeletion = (dir: string): Promise<void> =>
  fs.promises.rm(path.join(dir, TEMPLATE_CONFIG_FILENAME));

export const readBaseTemplateFile = (src: string): Promise<string> =>
  fs.promises.readFile(path.join(BASE_TEMPLATE_DIR, src), 'utf8');
