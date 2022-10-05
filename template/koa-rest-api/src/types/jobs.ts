import { z } from 'zod';

export interface Job {
  id: string;

  hirer: {
    id: string;
  };
}

export type JobInput = z.infer<typeof JobInput>;

export const JobInput = z.object({
  hirer: z.object({
    id: z.string(),
  }),
});
