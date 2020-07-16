/* eslint-disable new-cap */

import * as t from 'runtypes';
import checkFilter from 'runtypes-filter';

export type JobScorerInput = t.Static<typeof JobScorerInput>;

const JobScorerInput = t.Record({
  id: t.String,
  details: t.String,
});

export const filterJobScorerInput = checkFilter(JobScorerInput);

export type JobScorerOutput = t.Static<typeof JobScorerOutput>;

const JobScorerOutput = t.Record({
  id: t.String,
  score: t.Number,
});

export const filterJobScorerOutput = checkFilter(JobScorerOutput);
