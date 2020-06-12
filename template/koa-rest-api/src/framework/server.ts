import Koa, { Context, DefaultState, Middleware } from 'koa';
import compose from 'koa-compose';
import {
  ErrorMiddleware,
  MetricsMiddleware,
  RequestLogging,
  VersionMiddleware,
} from 'seek-koala';

import { config } from 'src/config';
import { rootLogger } from 'src/framework/logging';
import { metricsClient } from 'src/framework/metrics';

const metrics = MetricsMiddleware.create(
  metricsClient,
  ({ _matchedRoute }) => ({
    route: typeof _matchedRoute === 'string' ? _matchedRoute : 'unspecified',
  }),
);

const requestLogging = RequestLogging.createMiddleware<DefaultState, Context>(
  (ctx, fields, err) => {
    /* istanbul ignore next: error handler should catch `err` first */
    const data = {
      ...fields,
      err: err ?? ErrorMiddleware.thrown(ctx),
    };

    return ctx.status < 500
      ? rootLogger.info(data, 'request')
      : rootLogger.error(data, 'request');
  },
);

const version = VersionMiddleware.create({
  name: config.name,
  version: config.version,
});

export const createApp = <State, Context>(
  ...middleware: Middleware<State, Context>[]
) =>
  new Koa()
    .use(requestLogging)
    .use(metrics)
    .use(ErrorMiddleware.handle)
    .use(version)
    .use(compose(middleware));
