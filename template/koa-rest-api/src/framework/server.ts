import {
  MetricsMiddleware,
  RequestLogging,
  VersionMiddleware,
} from '@seek/koala';
import Koa, { Context, DefaultState, Middleware } from 'koa';
import compose from 'koa-compose';

import { config } from 'src/config';
import { rootLogger } from 'src/framework/logging';
import { metricsClient } from 'src/framework/metrics';

/**
 * @see {@link https://github.com/microsoft/TypeScript/issues/1863}
 */
const ERROR_STATE_KEY = (Symbol('error') as unknown) as string;

const error: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.state[ERROR_STATE_KEY] = err;

    if (typeof err !== 'object' || err === null) {
      ctx.status = 500;
      ctx.body = '';
      return;
    }

    ctx.status = err.status || 500;
    ctx.body = err.status < 500 ? err.message : '';
  }
};

const metrics = MetricsMiddleware.create(
  metricsClient,
  ({ _matchedRoute }) => ({
    route: typeof _matchedRoute === 'string' ? _matchedRoute : 'unspecified',
  }),
);

const requestLogging = RequestLogging.createMiddleware<DefaultState, Context>(
  (ctx, fields, err) => {
    /* istanbul ignore next: error handler should catch `err` first */
    const data = { ...fields, err: err ?? ctx.state[ERROR_STATE_KEY] };

    return ctx.status < 500 && typeof err === 'undefined'
      ? rootLogger.info(data, 'request')
      : rootLogger.error(data, 'request');
  },
);

const version = VersionMiddleware.create(config);

export const createApp = <State, Context>(
  ...middleware: Middleware<State, Context>[]
) =>
  new Koa()
    .use(requestLogging)
    .use(metrics)
    .use(error)
    .use(version)
    .use(compose(middleware));
