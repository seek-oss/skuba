import Koa from 'koa';

export const app = new Koa().use((ctx) => {
  if (ctx.request.path === '/koa') {
    ctx.body = 'Koa Named Export!';
  }
});
