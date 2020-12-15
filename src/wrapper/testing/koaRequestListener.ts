import Koa from 'koa';

const app = new Koa().use((ctx) => {
  if (ctx.request.path === '/koa') {
    ctx.body = 'Koa!';
  }
});

Object.assign(app, {
  // This is invalid and should be ignored
  port: 65536,
});

export default app;
