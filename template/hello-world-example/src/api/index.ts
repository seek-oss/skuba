import Router from '@koa/router';

import { healthCheckHandler } from './healthCheck';
import { jobRouter } from './jobs';
import { smokeTestHandler } from './smokeTest';

export const router = new Router()
  .get('/health', healthCheckHandler)
  .get('/smoke', smokeTestHandler)
  .use('/jobs', jobRouter.routes());
