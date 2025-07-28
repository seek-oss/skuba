import Router from '@koa/router';

import { healthCheckHandler } from './healthCheck.js';
import { jobRouter } from './jobs/index.js';
import { smokeTestHandler } from './smokeTest.js';

export const router = new Router()
  .get('/health', healthCheckHandler)
  .get('/smoke', smokeTestHandler)
  .use('/jobs', jobRouter.routes());
