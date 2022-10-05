import { Chance } from 'chance';
import { z } from 'zod';

import { JobPublishedEvent } from 'src/types/pipelineEvents';

export type IdDescription = z.infer<typeof IdDescription>;

export const IdDescription = z.object({
  id: z.string(),
  description: z.string(),
});

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
