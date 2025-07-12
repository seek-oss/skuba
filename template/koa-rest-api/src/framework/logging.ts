import createLogger, { createDestination } from '@seek/logger';
import { RequestLogging } from 'seek-koala';

import { config } from 'src/config.js';

const { createContextMiddleware, mixin } =
  RequestLogging.createContextStorage();

export const contextMiddleware = createContextMiddleware();

const { destination, stdoutMock } = createDestination({
  mock: config.environment === 'test',
});

export { stdoutMock };

export const logger = createLogger(
  {
    base: {
      environment: config.environment,
      version: config.version,
    },

    mixin,

    level: config.logLevel,

    name: config.name,

    transport:
      config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
  },
  destination,
);
