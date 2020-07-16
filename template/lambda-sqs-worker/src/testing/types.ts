/* eslint-disable new-cap */

import { Chance } from 'chance';
import * as t from 'runtypes';
import checkFilter from 'runtypes-filter';

import { JobPublishedEvent } from 'src/types/pipelineEvents';

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

export const mockIdDescriptionJson = (): string =>
  JSON.stringify(mockIdDescription());

export const mockJobPublishedEvent = ({
  entityId,
}: {
  entityId: string;
}): JobPublishedEvent => ({
  data: {
    details: chance.paragraph(),
  },
  entityId,
  eventType: 'JobPublished',
});
