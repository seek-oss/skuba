/* eslint-disable new-cap */

import { Number, Record, Static, String } from 'runtypes';
import { validate } from 'runtypes-filter';

export type JobScorerInput = Static<typeof JobScorerInput>;

export const JobScorerInput = Record({
  id: String,
  details: String,
});

export type JobScorerOutput = Static<typeof JobScorerOutput>;

export const JobScorerOutput = Record({
  id: String,
  score: Number,
});

validate(JobScorerInput);
validate(JobScorerOutput);
