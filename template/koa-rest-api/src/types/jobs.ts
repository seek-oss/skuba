import { z } from 'zod/v4';

export interface Job {
  id: string;

  hirer: {
    id: string;
  };
}

export type JobInput = z.infer<typeof JobInputSchema>;

export const JobInputSchema = z.object({
  hirer: z.object({
    id: z.string(),
  }),
});
