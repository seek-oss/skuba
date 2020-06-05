import { Middleware } from 'koa';

import { contextLogger } from 'src/framework/logging';
import { metricsClient } from 'src/framework/metrics';
import { validateRequestBody } from 'src/framework/validation';
import * as storage from 'src/storage/jobs';
import { jobInputSchema } from 'src/types/jobs';

export const postJobHandler: Middleware = async (ctx) => {
  const jobInput = await validateRequestBody(ctx, jobInputSchema);

  const job = await storage.createJob(jobInput);

  // no PII in these jobs
  contextLogger(ctx).debug({ job }, 'created job');

  metricsClient.increment('job.creations');

  ctx.body = job;
};
