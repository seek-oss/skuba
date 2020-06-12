import { Server } from 'http';

import Router from '@koa/router';
import Koa, { Middleware } from 'koa';
import request from 'supertest';

import { createApp } from 'src/framework/server';

/**
 * Create a new SuperTest agent from a Koa application.
 */
export const agentFromApp = <State, Context>(app: Koa<State, Context>) => {
  let server: Server;
  let agent: request.SuperTest<request.Test>;

  const getAgent = () => agent;

  const setup = async () => {
    await new Promise((resolve) => (server = app.listen(undefined, resolve)));
    agent = request.agent(server);
  };

  const teardown = () => new Promise((resolve) => server.close(resolve));

  return Object.assign(getAgent, { setup, teardown });
};

/**
 * Create a new SuperTest agent from a set of Koa middleware.
 */
export const agentFromMiddleware = <State, Context>(
  ...middleware: Middleware<State, Context>[]
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
