import { logger } from '#src/framework/logging.js';
import { metricsClient } from '#src/framework/metrics.js';
import { validateRequestBody } from '#src/framework/validation.js';
import * as storage from '#src/storage/jobs.js';
import { JobInputSchema } from '#src/types/jobs.js';
import type { Middleware } from '#src/types/koa.js';

export const postJobHandler: Middleware = async (ctx) => {
  const jobInput = validateRequestBody(ctx, JobInputSchema);

  const job = await storage.createJob(jobInput);

  // no PII in these jobs
  logger.debug({ job }, 'created job');

  metricsClient.increment('job.creations');

  ctx.body = job;
};
