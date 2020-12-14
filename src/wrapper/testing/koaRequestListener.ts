import Koa from 'koa';

export default new Koa().use((ctx) => {
  if (ctx.request.path === '/koa') {
    ctx.body = 'Koa!';
  }
});
