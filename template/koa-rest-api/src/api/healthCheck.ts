import { Middleware } from 'src/types/koa';

export const healthCheckHandler: Middleware = (ctx) => {
  ctx.state.skipRequestLogging = true;

  ctx.body = '';
};
