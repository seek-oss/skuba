import { Middleware } from 'koa';

export const smokeTestHandler: Middleware = (ctx) => (ctx.body = '');
