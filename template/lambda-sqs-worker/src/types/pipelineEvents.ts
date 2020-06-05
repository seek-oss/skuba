/* eslint-disable new-cap */

import { Literal, Number, Record, Static, String } from 'runtypes';
import { validate } from 'runtypes-filter';

export type JobPublishedEvent = Static<typeof JobPublishedEvent>;

export const JobPublishedEvent = Record({
  data: Record({
    details: String,
  }),
  entityId: String,
  eventType: Literal('JobPublished'),
});

export type JobScoredEvent = Static<typeof JobScoredEvent>;

export const JobScoredEvent = Record({
  data: Record({
    score: Number,
  }),
  entityId: String,
  eventType: Literal('JobScored'),
});

validate(JobPublishedEvent);
validate(JobScoredEvent);
