import Koa from 'koa';
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

const requestLogging = RequestLogging.createMiddleware((ctx, fields, err) => {
  if (ctx.status < 400 && err === undefined) {
    // Depend on sidecar logging for happy path requests
    return;
  }

  return ctx.status < 500
    ? rootLogger.info(fields, 'Client error')
    : rootLogger.error(fields, 'Server error');
});

const version = VersionMiddleware.create({
  name: config.name,
  version: config.version,
});

export const createApp = <State, Context>(
  ...middleware: Koa.Middleware<State, Context>[]
) =>
  new Koa()
    .use(requestLogging)
    .use(metrics)
    .use(ErrorMiddleware.handle)
    .use(version)
    .use(compose(middleware));
