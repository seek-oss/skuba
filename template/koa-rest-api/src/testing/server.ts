import type Router from '@koa/router';
import type Koa from 'koa';
import request from 'supertest';

import { createApp } from '#src/framework/server.js';

/**
 * Create a new SuperTest agent from a Koa application.
 */
export const agentFromApp = <State, Context>(app: Koa<State, Context>) =>
  request.agent(app.callback());

/**
 * Create a new SuperTest agent from a set of Koa middleware.
 */
export const agentFromMiddleware = <State, Context>(
  ...middleware: Array<Koa.Middleware<State, Context>>
) => {
  const app = createApp(...middleware);

  return agentFromApp(app);
};

/**
 * Create a new SuperTest agent from a Koa router.
 */
export const agentFromRouter = (router: Router) => {
  const app = createApp(router.routes(), router.allowedMethods());

  return agentFromApp(app);
};
