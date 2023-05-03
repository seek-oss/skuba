import http from 'http';

import Koa from 'koa';

const app = new Koa().use((ctx) => {
  if (ctx.request.path === '/httpServer') {
    ctx.body = 'Http Server!';
  }
});

// FIXME: https://github.com/koajs/koa/issues/1755
// eslint-disable-next-line @typescript-eslint/no-misused-promises
const httpServer = http.createServer(app.callback());

Object.assign(httpServer, {
  port: 65536,
});

export default httpServer;
