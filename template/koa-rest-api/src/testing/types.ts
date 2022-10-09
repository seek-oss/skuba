import { Chance } from 'chance';
import { z } from 'zod';

import { JobInput } from 'src/types/jobs';

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

export const mockJobInput = (): JobInput => ({
  hirer: {
    id: chance.guid({ version: 4 }),
  },
});
