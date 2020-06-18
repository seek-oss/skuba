/* eslint-disable new-cap */

import * as t from 'runtypes';

import { ProjectType } from '../../utils/manifest';

const INIT_CONFIG_INPUT_FIELDS = {
  destinationDir: t.String,
  templateComplete: t.Boolean,
  templateData: t
    .Record({
      teamName: t.String,
      repoName: t.String,
      orgName: t.String,
    })
    .And(t.Dictionary(t.String, 'string')),
  templateName: t.String,
};

export type InitConfigInput = t.Static<typeof InitConfigInput>;

export const InitConfigInput = t.Record(INIT_CONFIG_INPUT_FIELDS);

export type InitConfig = t.Static<typeof InitConfig>;

export const InitConfig = t.Record({
  ...INIT_CONFIG_INPUT_FIELDS,

  entryPoint: t.String.Or(t.Undefined),
  type: ProjectType.Or(t.Undefined),
});
