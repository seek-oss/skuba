/* eslint-disable new-cap */

import path from 'path';

import fs from 'fs-extra';
import * as t from 'runtypes';

import { ProjectType } from './manifest';

export type TemplateConfig = t.Static<typeof TemplateConfig>;

/**
 * TODO: migrate from `t.Partial` to `.optional()` once Runtypes 6 is released.
 */
export const TemplateConfig = t
  .Record({
    fields: t.Array(
      t
        .Record({
          name: t.String,
          message: t.String,
          initial: t.String,
        })
        .And(
          t.Partial({
            validate: t.Function,
          }),
        ),
    ),
  })
  .And(
    t.Partial({
      entryPoint: t.String,
      noSkip: t.Boolean,
      type: ProjectType,
    }),
  );

export const TEMPLATE_CONFIG_FILENAME = 'skuba.template.js';

export const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'template');

export const BASE_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'base');

export const ensureTemplateConfigDeletion = (dir: string): Promise<void> =>
  fs.remove(path.join(dir, TEMPLATE_CONFIG_FILENAME));

export const readBaseTemplateFile = (src: string): Promise<string> =>
  fs.readFile(path.join(BASE_TEMPLATE_DIR, src), 'utf8');
