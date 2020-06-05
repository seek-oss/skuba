import {
  jobPublishedEventToScorerInput,
  jobScorerOutputToScoredEvent,
} from 'src/mapping/jobScorer';
import { JobScorerInput, JobScorerOutput } from 'src/types/jobScorer';
import { JobPublishedEvent, JobScoredEvent } from 'src/types/pipelineEvents';

/* istanbul ignore next: simulation of an external service */
export const scoringService = {
  request: (details: string): Promise<unknown> => {
    // networking woes
    if (Math.random() < 0.05) {
      const err = Error('could not reach scoring service');

      return Promise.reject(err);
    }

    // unexpected behaviour on certain inputs
    if (details.length % 100 === 0) {
      return Promise.resolve(null);
    }

    return Promise.resolve(Math.random());
  },
};

const scoreJob = async ({
  details,
  id,
}: JobScorerInput): Promise<JobScorerOutput> => {
  const score = await scoringService.request(details);

  return JobScorerOutput.check({
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
