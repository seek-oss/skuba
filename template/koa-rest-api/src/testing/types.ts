import { Chance } from 'chance';
import * as z from 'zod/v4';

import type { JobInput } from 'src/types/jobs.js';

export type IdDescription = z.infer<typeof IdDescriptionSchema>;

export const IdDescriptionSchema = z.union([
  z.object({
    id: z.string(),
    description: z.union([
      z.string(),
      z.object({
        fontSize: z.number(),
        content: z.string(),
      }),
    ]),
  }),
  z.object({
    id: z.number(),
    summary: z.string(),
  }),
]);

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
