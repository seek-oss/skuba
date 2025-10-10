import { AsyncLocalStorage } from 'async_hooks';

import { createDestination, createLogger } from '@seek/logger';

import { config } from '#src/config.js';

interface LambdaContext {
  awsRequestId: string;
}

interface RecordContext {
  sqsMessageId: string;
}

export const lambdaContext = new AsyncLocalStorage<LambdaContext>();
export const recordContext = new AsyncLocalStorage<RecordContext>();

const { destination, stdoutMock } = createDestination({
  mock: config.deployment === 'test' && {
    redact: ['awsRequestId'],
  },
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

    level: config.logLevel,

    mixin: () => ({
      ...lambdaContext.getStore(),
      ...recordContext.getStore(),
    }),

    transport:
      config.deployment === 'local' ? { target: 'pino-pretty' } : undefined,
  },
  destination,
);
