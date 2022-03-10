/* eslint-disable new-cap */

import { Chance } from 'chance';
import * as t from 'runtypes';
import checkFilter from 'runtypes-filter';

import { JobInput } from 'src/types/jobs';

export type IdDescription = t.Static<typeof IdDescription>;

const IdDescription = t.Record({
  id: t.String,
  description: t.String,
});

export const filterIdDescription = checkFilter(IdDescription);

export const chance = new Chance();

export const mockIdDescription = (): IdDescription => ({
  id: chance.guid({ version: 4 }),
  description: chance.sentence(),
});

export const mockJobInput = (): JobInput => ({
  hirer: {
    id: chance.guid({ version: 4 }),
  },
});
