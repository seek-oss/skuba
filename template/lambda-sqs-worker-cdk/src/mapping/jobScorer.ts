import type { JobScorerInput, JobScorerOutput } from '#src/types/jobScorer.js';
import type {
  JobPublishedEvent,
  JobScoredEvent,
} from '#src/types/pipelineEvents.js';

export const jobPublishedEventToScorerInput = (
  record: JobPublishedEvent,
): JobScorerInput => ({
  details: record.data.details,
  id: record.entityId,
});

export const jobScorerOutputToScoredEvent = (
  output: JobScorerOutput,
): JobScoredEvent => ({
  data: {
    score: output.score,
  },
  entityId: output.id,
  eventType: 'JobScored',
});
