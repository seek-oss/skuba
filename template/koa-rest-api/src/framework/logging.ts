import { AsyncLocalStorage } from 'async_hooks';

import createLogger from '@seek/logger';
import { RequestLogging } from 'seek-koala';

import { config } from 'src/config';
import { Middleware } from 'src/types/koa';

export const loggingContext = new AsyncLocalStorage<RequestLogging.Fields>();

export const loggingContextMiddleware: Middleware = async (ctx, next) => {
  await loggingContext.run(RequestLogging.contextFields(ctx), async () =>
    next(),
  );
};

export const logger = createLogger({
  base: {
    environment: config.environment,
    version: config.version,
  },

  mixin() {
    return loggingContext.getStore() ?? {};
  },

  level: config.logLevel,

  name: config.name,

  transport:
    config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
});
