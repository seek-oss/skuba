import { v4 as uuidv4 } from 'uuid';

import { Job, JobInput } from 'src/types/jobs';

const jobStore: Record<string, Job> = {};

export const createJob = (jobInput: JobInput): Promise<Job> => {
  const id = uuidv4();

  const job = { ...jobInput, id };

  jobStore[id] = job;

  return Promise.resolve(job);
};

export const readJobs = (): Promise<Job[]> => {
  const jobs = Object.values(jobStore);

  return Promise.resolve(jobs);
};
