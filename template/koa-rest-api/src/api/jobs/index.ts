import Router from '@koa/router';

import { jsonBodyParser } from 'src/framework/bodyParser';

import { getJobsHandler } from './getJobs';
import { postJobHandler } from './postJob';

export const jobRouter = new Router()
  .get('/', getJobsHandler)
  .post('/', jsonBodyParser, postJobHandler);
