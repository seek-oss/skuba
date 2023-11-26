import { AsyncLocalStorage } from 'async_hooks';

import createLogger from '@seek/logger';

import { config } from 'src/config';

interface LoggerContext {
  awsRequestId: string;
}

export const loggerContext = new AsyncLocalStorage<LoggerContext>();

export const logger = createLogger({
  base: {
    environment: config.environment,
    version: config.version,
  },

  level: config.logLevel,

  mixin: () => ({ ...loggerContext.getStore() }),

  name: config.name,

  transport:
    config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
});
