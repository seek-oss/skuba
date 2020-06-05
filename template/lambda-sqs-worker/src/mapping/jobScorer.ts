import { JobScorerInput, JobScorerOutput } from 'src/types/jobScorer';
import { JobPublishedEvent, JobScoredEvent } from 'src/types/pipelineEvents';

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
