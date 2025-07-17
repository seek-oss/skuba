import { logger } from 'src/framework/logging.js';
import { metricsClient } from 'src/framework/metrics.js';
import * as storage from 'src/storage/jobs.js';
import type { Middleware } from 'src/types/koa.js';

export const getJobsHandler: Middleware = async (ctx) => {
  const jobs = await storage.readJobs();

  // no PII in these jobs
  logger.debug({ jobs }, 'read jobs');

  metricsClient.increment('job.reads', jobs.length);

  ctx.body = jobs;
};
