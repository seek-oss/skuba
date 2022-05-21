import createLogger from '@seek/logger';
import { RequestLogging } from 'seek-koala';

import { config } from 'src/config';

const { createContextMiddleware, mixin } =
  RequestLogging.createContextStorage();

export const contextMiddleware = createContextMiddleware();

export const logger = createLogger({
  base: {
    environment: config.environment,
    version: config.version,
  },

  mixin,

  level: config.logLevel,

  name: config.name,

  transport:
    config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
});
