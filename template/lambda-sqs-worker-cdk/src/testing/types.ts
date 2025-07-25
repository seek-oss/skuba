import { Chance } from 'chance';
import * as z from 'zod/v4';

import type { JobPublishedEvent } from 'src/types/pipelineEvents.js';

export type IdDescription = z.infer<typeof IdDescriptionSchema>;

export const IdDescriptionSchema = z.object({
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
