import { z } from 'zod';

export type JobPublishedEvent = z.infer<typeof JobPublishedEvent>;

export const JobPublishedEvent = z.object({
  data: z.object({
    details: z.string(),
  }),
  entityId: z.string(),
  eventType: z.literal('JobPublished'),
});

export type JobScoredEvent = z.infer<typeof JobScoredEvent>;

export const JobScoredEvent = z.object({
  data: z.object({
    score: z.number(),
  }),
  entityId: z.string(),
  eventType: z.literal('JobScored'),
});
