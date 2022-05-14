import { AsyncLocalStorage } from 'async_hooks';

import createLogger from '@seek/logger';
import { RequestLogging } from 'seek-koala';

import { config } from 'src/config';
import { Middleware } from 'src/types/koa';

const loggerContext = new AsyncLocalStorage<RequestLogging.Fields>();

export const loggerContextMiddleware: Middleware = async (ctx, next) => {
  await loggerContext.run(RequestLogging.contextFields(ctx), () => next());
};

export const logger = createLogger({
  base: {
    environment: config.environment,
    version: config.version,
  },

  mixin() {
    return loggerContext.getStore() ?? {};
  },

  level: config.logLevel,

  name: config.name,

  transport:
    config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
});
