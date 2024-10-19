import { z } from 'zod';

export type JobPublishedEvent = z.infer<typeof JobPublishedEventSchema>;

export const JobPublishedEventSchema = z.object({
  data: z.object({
    details: z.string(),
  }),
  entityId: z.string(),
  eventType: z.literal('JobPublished'),
});

export type JobScoredEvent = z.infer<typeof JobScoredEventSchema>;

export const JobScoredEventSchema = z.object({
  data: z.object({
    score: z.number(),
  }),
  entityId: z.string(),
  eventType: z.literal('JobScored'),
});
