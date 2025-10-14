import { createDestination, createLogger } from '@seek/logger';
import { RequestLogging } from 'seek-koala';

import { config } from '#src/config.js';

const { createContextMiddleware, mixin } =
  RequestLogging.createContextStorage();

export const contextMiddleware = createContextMiddleware();

const { destination, stdoutMock } = createDestination({
  mock: config.deployment === 'test',
});

export { stdoutMock };

export const logger = createLogger(
  {
    eeeoh: {
      /**
       * TODO: choose an appropriate Datadog log tier.
       *
       * https://github.com/seek-oss/logger/blob/master/docs/eeeoh.md#datadog-log-tiers
       */
      datadog: 'tin',
      team: '<%- teamName %>',
      use: 'environment',
    },

    mixin,

    level: config.logLevel,

    transport:
      config.deployment === 'local' ? { target: 'pino-pretty' } : undefined,
  },
  destination,
);
