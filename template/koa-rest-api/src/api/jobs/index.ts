import Router from '@koa/router';

import { getJobsHandler } from './getJobs.js';
import { postJobHandler } from './postJob.js';

import { jsonBodyParser } from '#src/framework/bodyParser.js';

export const jobRouter = new Router()
  .get('/', getJobsHandler)
  .post('/', jsonBodyParser, postJobHandler);
