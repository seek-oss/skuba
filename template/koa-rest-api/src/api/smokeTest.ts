import { Middleware } from 'src/types/koa';

export const smokeTestHandler: Middleware = (ctx) => (ctx.body = '');
