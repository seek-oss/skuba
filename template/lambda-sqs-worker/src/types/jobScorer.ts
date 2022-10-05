import { z } from 'zod';

export type JobScorerInput = z.infer<typeof JobScorerInput>;

const JobScorerInput = z.object({
  id: z.string(),
  details: z.string(),
});

export type JobScorerOutput = z.infer<typeof JobScorerOutput>;

export const JobScorerOutput = z.object({
  id: z.string(),
  score: z.number(),
});
