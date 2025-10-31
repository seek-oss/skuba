import { afterEach, describe, expect, it, vi } from 'vitest';

import Router from '@koa/router';

import { stdoutMock } from './logging.js';

import { metricsClient } from '#src/testing/metrics.js';
import { agentFromRouter } from '#src/testing/server.js';
import { chance } from '#src/testing/types.js';
import type { Middleware } from '#src/types/koa.js';

const middleware = vi.fn<Middleware>();
const router = new Router()
  .use('/nested', new Router().put('/:param', middleware).routes())
  .get('/', middleware);

const agent = agentFromRouter(router);

describe('createApp', () => {
  afterEach(() => {
    metricsClient.clear();
    stdoutMock.clear();
  });

  it('handles root route', async () => {
    middleware.mockImplementation((ctx) => (ctx.body = ''));

    await agent
      .get('/')
      .expect(200, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(stdoutMock.calls).toHaveLength(0);

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

    expect(stdoutMock.calls).toHaveLength(0);

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

    expect(stdoutMock.calls).toMatchObject([
      {
        level: 30,
        method: 'GET',
        msg: 'Client error',
        status: 404,
        url: '/unknown',
      },
    ]);

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:404',
      'http_status_family:4xx',
      'route:unspecified',
    ]);
  });

  it('handles returned client error', async () => {
    const message = chance.sentence();

    middleware.mockImplementation((ctx) => {
      ctx.body = message;
      ctx.status = 400;
    });

    await agent
      .get('/')
      .expect(400, message)
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(stdoutMock.calls).toMatchObject([
      {
        level: 30,
        method: 'GET',
        msg: 'Client error',
        route: '/',
        status: 400,
        url: '/',
      },
    ]);

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:400',
      'http_status_family:4xx',
      'route:/',
    ]);
  });

  it('handles client error thrown from context', async () => {
    const message = chance.sentence();

    middleware.mockImplementation((ctx) => ctx.throw(400, message));

    await agent
      .get('/')
      .expect(400, message)
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(stdoutMock.calls).toMatchObject([
      {
        error: {
          statusCode: 400,
          type: 'BadRequestError',
        },
        level: 30,
        method: 'GET',
        msg: 'Client error',
        route: '/',
        status: 400,
        url: '/',
      },
    ]);

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:400',
      'http_status_family:4xx',
      'route:/',
    ]);
  });

  it('handles server error thrown from context', async () => {
    const message = chance.sentence();

    middleware.mockImplementation((ctx) => ctx.throw(500, message));

    await agent
      .get('/')
      .expect(500, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(stdoutMock.calls).toMatchObject([
      {
        error: {
          statusCode: 500,
          type: 'InternalServerError',
        },
        level: 50,
        method: 'GET',
        msg: 'Server error',
        route: '/',
        status: 500,
        url: '/',
      },
    ]);

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

    expect(stdoutMock.calls).toMatchObject([
      {
        error: {
          message: err.message,
          type: 'Error',
        },
        level: 50,
        method: 'GET',
        msg: 'Server error',
        route: '/',
        status: 500,
        url: '/',
      },
    ]);

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:500',
      'http_status_family:5xx',
      'route:/',
    ]);
  });

  it('handles null error', async () => {
    middleware.mockImplementation(() => {
      throw null;
    });

    await agent
      .get('/')
      .expect(500, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(stdoutMock.calls).toMatchObject([
      {
        error: null,
        level: 50,
        method: 'GET',
        msg: 'Server error',
        route: '/',
        status: 500,
        url: '/',
      },
    ]);

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:500',
      'http_status_family:5xx',
      'route:/',
    ]);
  });

  it('handles string error', async () => {
    const error = chance.sentence();

    middleware.mockImplementation(() => {
      throw error;
    });

    await agent
      .get('/')
      .expect(500, '')
      .expect('server', /.+/)
      .expect('x-api-version', /.+/);

    expect(stdoutMock.calls).toMatchObject([
      {
        error,
        level: 50,
        method: 'GET',
        msg: 'Server error',
        route: '/',
        status: 500,
        url: '/',
      },
    ]);

    metricsClient.expectTagSubset([
      'http_method:get',
      'http_status:500',
      'http_status_family:5xx',
      'route:/',
    ]);
  });
});
