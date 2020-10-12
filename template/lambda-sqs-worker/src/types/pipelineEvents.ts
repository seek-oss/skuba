/* eslint-disable new-cap */

import * as t from 'runtypes';
import checkFilter from 'runtypes-filter';

export type JobPublishedEvent = t.Static<typeof JobPublishedEvent>;

const JobPublishedEvent = t.Record({
  data: t.Record({
    details: t.String,
  }),
  entityId: t.String,
  eventType: t.Literal('JobPublished'),
});

export const filterJobPublishedEvent = checkFilter(JobPublishedEvent);

export type JobScoredEvent = t.Static<typeof JobScoredEvent>;

const JobScoredEvent = t.Record({
  data: t.Record({
    score: t.Number,
  }),
  entityId: t.String,
  eventType: t.Literal('JobScored'),
});

export const filterJobScoredEvent = checkFilter(JobScoredEvent);
