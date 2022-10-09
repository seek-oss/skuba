import { z } from 'zod';

export type JobScorerInput = z.infer<typeof JobScorerInputSchema>;

const JobScorerInputSchema = z.object({
  id: z.string(),
  details: z.string(),
});

export type JobScorerOutput = z.infer<typeof JobScorerOutputSchema>;

export const JobScorerOutputSchema = z.object({
  id: z.string(),
  score: z.number(),
});
