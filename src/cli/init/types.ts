/* eslint-disable new-cap */

import * as t from 'runtypes';

export type InitConfig = t.Static<typeof InitConfig>;

export const InitConfig = t.Record({
  destinationDir: t.String,
  entryPoint: t.String.Or(t.Undefined),
  templateComplete: t.Boolean,
  templateData: t
    .Record({
      gitHubTeamName: t.String,
      repoName: t.String,
    })
    .And(t.Dictionary(t.String, 'string')),
  templateName: t.String,
});
