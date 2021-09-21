/* eslint-disable new-cap */

import fs from 'fs';
import path from 'path';

import * as t from 'runtypes';

import { ProjectType } from './manifest';

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

export const TEMPLATE_CONFIG_FILENAME = 'skuba.template.js';

export const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'template');

export const BASE_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'base');

export const ensureTemplateConfigDeletion = (dir: string): Promise<void> =>
  fs.promises.rm(path.join(dir, TEMPLATE_CONFIG_FILENAME));

export const readBaseTemplateFile = (src: string): Promise<string> =>
  fs.promises.readFile(path.join(BASE_TEMPLATE_DIR, src), 'utf8');
