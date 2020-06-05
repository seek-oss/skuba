import { Middleware } from 'koa';

export const healthCheckHandler: Middleware = (ctx) => {
  ctx.state.skipRequestLogging = true;

  ctx.body = '';
};
