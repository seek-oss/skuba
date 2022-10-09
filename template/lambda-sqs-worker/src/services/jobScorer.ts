import {
  jobPublishedEventToScorerInput,
  jobScorerOutputToScoredEvent,
} from 'src/mapping/jobScorer';
import {
  JobScorerInput,
  JobScorerOutput,
  JobScorerOutputSchema,
} from 'src/types/jobScorer';
import { JobPublishedEvent, JobScoredEvent } from 'src/types/pipelineEvents';

/* istanbul ignore next: simulation of an external service */
export const scoringService = {
  request: (details: string): Promise<unknown> => {
    // Networking woes
    if (Math.random() < 0.05) {
      const err = Error('could not reach scoring service');

      return Promise.reject(err);
    }

    // Unexpected behaviour on certain inputs
    if (details.length % 100 === 0) {
      return Promise.resolve(null);
    }

    return Promise.resolve(Math.random());
  },

  smokeTest: async (): Promise<void> => {
    // A connectivity test
    await Promise.resolve();
  },
};

const scoreJob = async ({
  details,
  id,
}: JobScorerInput): Promise<JobScorerOutput> => {
  const score = await scoringService.request(details);

  return JobScorerOutputSchema.parse({
    id,
    score,
  });
};

export const scoreJobPublishedEvent = async (
  publishedJob: JobPublishedEvent,
): Promise<JobScoredEvent> => {
  const scorerInput = jobPublishedEventToScorerInput(publishedJob);

  const scorerOutput = await scoreJob(scorerInput);

  return jobScorerOutputToScoredEvent(scorerOutput);
};
