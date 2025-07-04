import Router from '@koa/router';

import { jsonBodyParser } from 'src/framework/bodyParser.js';

import { getJobsHandler } from './getJobs.js';
import { postJobHandler } from './postJob.js';

export const jobRouter = new Router()
  .get('/', getJobsHandler)
  .post('/', jsonBodyParser, postJobHandler);
