/* eslint-disable new-cap */

import path from 'path';

import fs from 'fs-extra';
import * as t from 'runtypes';

import { ProjectType } from './manifest';

export type TemplateConfig = t.Static<typeof TemplateConfig>;

export const TemplateConfig = t
  .Record({
    entryPoint: t.String.Or(t.Undefined),
    fields: t.Array(
      t.Record({
        name: t.String,
        message: t.String,
        initial: t.String,
        validate: t.Function.Or(t.Undefined),
      }),
    ),
    type: ProjectType.Or(t.Undefined),
  })
  .And(
    t.Partial({
      noSkip: t.Boolean.Or(t.Undefined),
    }),
  );

export const TEMPLATE_CONFIG_FILENAME = 'skuba.template.js';

export const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'template');

export const BASE_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'base');

export const ensureTemplateConfigDeletion = (dir: string): Promise<void> =>
  fs.remove(path.join(dir, TEMPLATE_CONFIG_FILENAME));

export const readBaseTemplateFile = (src: string): Promise<string> =>
  fs.readFile(path.join(BASE_TEMPLATE_DIR, src), 'utf8');
