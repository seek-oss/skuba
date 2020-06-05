/* eslint-disable new-cap */

import { Chance } from 'chance';
import { Record, Static, String } from 'runtypes';
import { validate } from 'runtypes-filter';

import { JobPublishedEvent } from 'src/types/pipelineEvents';

export type IdDescription = Static<typeof IdDescription>;

export const IdDescription = Record({
  id: String,
  description: String,
});

validate(IdDescription);

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
