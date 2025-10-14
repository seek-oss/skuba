import { randomUUID } from 'crypto';

import type { Job, JobInput } from '#src/types/jobs.js';

const jobStore: Record<string, Job> = {};

export const createJob = (jobInput: JobInput): Promise<Job> => {
  const id = randomUUID();

  const job = { ...jobInput, id };

  jobStore[id] = job;

  return Promise.resolve(job);
};

export const readJobs = (): Promise<Job[]> => {
  const jobs = Object.values(jobStore);

  return Promise.resolve(jobs);
};

/**
 * Tests that we have access to read from and write to our storage.
 */
export const smokeTestJobStorage = async (): Promise<void> => {
  await Promise.resolve();
};
