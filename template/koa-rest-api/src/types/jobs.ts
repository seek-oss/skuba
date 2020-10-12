/* eslint-disable new-cap */

import * as t from 'runtypes';
import checkFilter from 'runtypes-filter';

export interface Job {
  id: string;

  hirer: {
    id: string;
  };
}

export type JobInput = t.Static<typeof JobInput>;

const JobInput = t.Record({
  hirer: t.Record({
    id: t.String,
  }),
});

export const filterJobInput = checkFilter(JobInput);
