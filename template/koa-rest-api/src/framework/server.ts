import Koa from 'koa';
import compose from 'koa-compose';
import {
  ErrorMiddleware,
  MetricsMiddleware,
  RequestLogging,
  SecureHeaders,
  VersionMiddleware,
} from 'seek-koala';

import { config } from 'src/config.js';
import { contextMiddleware, logger } from 'src/framework/logging.js';
import { metricsClient } from 'src/framework/metrics.js';

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
    ? logger.info(fields, 'Client error')
    : logger.error(fields, 'Server error');
});

const version = VersionMiddleware.create({
  name: config.name,
  version: config.version,
});

export const createApp = <State, Context>(
  ...middleware: Array<Koa.Middleware<State, Context>>
) =>
  new Koa()
    // Read: https://github.com/seek-oss/koala/tree/master/src/secureHeaders
    .use(SecureHeaders.middleware)
    .use(contextMiddleware)
    .use(requestLogging)
    .use(metrics)
    .use(ErrorMiddleware.handle)
    .use(version)
    .use(compose(middleware));
