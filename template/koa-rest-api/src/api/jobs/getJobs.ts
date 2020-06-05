import { Middleware } from 'koa';

import { contextLogger } from 'src/framework/logging';
import { metricsClient } from 'src/framework/metrics';
import * as storage from 'src/storage/jobs';

export const getJobsHandler: Middleware = async (ctx) => {
  const jobs = await storage.readJobs();

  // no PII in these jobs
  contextLogger(ctx).debug({ jobs }, 'read jobs');

  metricsClient.increment('job.reads', jobs.length);

  ctx.body = jobs;
};
