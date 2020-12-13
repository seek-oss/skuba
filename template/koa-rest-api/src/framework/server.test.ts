import Router from '@koa/router';
import { Middleware } from 'koa';

import { rootLogger } from 'src/testing/logging';
import { metricsClient } from 'src/testing/metrics';
import { agentFromRouter } from 'src/testing/server';
import { chance } from 'src/testing/types';

const middleware = jest.fn<void, Parameters<Middleware>>();

const router = new Router()
  .use('/nested', new Router().put('/:param', middleware).routes())
  .get('/', middleware);

const agent = agentFromRouter(router);

describe('createApp', () => {
  beforeAll(rootLogger.spy);

  afterEach(metricsClient.clear);
  afterEach(rootLogger.clear);

  it('handles root route', async () => {
    middleware.mockImplementation((ctx) => (ctx.body = ''));

    await agent
      .get('/')
      .expect(200, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).not.toBeCalled();

    expect(rootLogger.info).not.toBeCalled();

    metricsClient.expectTagSubset(['env:test', 'version:test']);
    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:200',
      'http_status_family:2xx',
      'route:/',
    ]);
  });

  it('handles nested route', async () => {
    middleware.mockImplementation((ctx) => (ctx.body = ''));

    await agent
      .put('/nested/123')
      .expect(200, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).not.toBeCalled();

    expect(rootLogger.info).not.toBeCalled();

    metricsClient.expectTagSubset([
      'http_method:put',
      'http_status:200',
      'http_status_family:2xx',
      'route:/nested/_param',
    ]);
  });

  it('handles unknown route', async () => {
    middleware.mockImplementation((ctx) => (ctx.body = ''));

    await agent
      .get('/unknown')
      .expect(404, 'Not Found')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).not.toBeCalled();

    expect(rootLogger.info).nthCalledWith(
      1,
      expect.objectContaining({ status: 404 }),
      'Client error',
    );

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:404',
      'http_status_family:4xx',
      'route:unspecified',
    ]);
  });

  it('handles client error', async () => {
    const message = chance.sentence();

    middleware.mockImplementation((ctx) => ctx.throw(400, message));

    await agent
      .get('/')
      .expect(400, message)
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).not.toBeCalled();

    expect(rootLogger.info).nthCalledWith(
      1,
      expect.objectContaining({ err: expect.any(Error), status: 400 }),
      'Client error',
    );

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:400',
      'http_status_family:4xx',
      'route:/',
    ]);
  });

  it('handles server error', async () => {
    const message = chance.sentence();

    middleware.mockImplementation((ctx) => ctx.throw(500, message));

    await agent
      .get('/')
      .expect(500, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).nthCalledWith(
      1,
      expect.objectContaining({ err: expect.any(Error), status: 500 }),
      'Server error',
    );

    expect(rootLogger.info).not.toBeCalled();

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:500',
      'http_status_family:5xx',
      'route:/',
    ]);
  });

  it('handles directly-thrown error', async () => {
    const err = Error(chance.sentence());

    middleware.mockImplementation(() => {
      throw err;
    });

    await agent
      .get('/')
      .expect(500, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).nthCalledWith(
      1,
      expect.objectContaining({ err, status: 500 }),
      'Server error',
    );

    expect(rootLogger.info).not.toBeCalled();

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:500',
      'http_status_family:5xx',
      'route:/',
    ]);
  });

  it('handles null error', async () => {
    middleware.mockImplementation(() => {
      /* eslint-disable-next-line no-throw-literal */
      throw null;
    });

    await agent
      .get('/')
      .expect(500, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).nthCalledWith(
      1,
      expect.objectContaining({ err: null, status: 500 }),
      'Server error',
    );

    expect(rootLogger.info).not.toBeCalled();

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:500',
      'http_status_family:5xx',
      'route:/',
    ]);
  });

  it('handles string error', async () => {
    const err = chance.sentence();

    middleware.mockImplementation(() => {
      throw err;
    });

    await agent
      .get('/')
      .expect(500, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(rootLogger.error).nthCalledWith(
      1,
      expect.objectContaining({ err, status: 500 }),
      'Server error',
    );

    expect(rootLogger.info).not.toBeCalled();

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:500',
      'http_status_family:5xx',
      'route:/',
    ]);
  });
});
