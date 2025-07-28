import { AsyncLocalStorage } from 'async_hooks';

import createLogger, { createDestination } from '@seek/logger';

import { config } from 'src/config.js';

interface LambdaContext {
  awsRequestId: string;
}

interface RecordContext {
  sqsMessageId: string;
}

export const lambdaContext = new AsyncLocalStorage<LambdaContext>();
export const recordContext = new AsyncLocalStorage<RecordContext>();

const { destination, stdoutMock } = createDestination({
  mock: config.environment === 'test' && {
    redact: ['awsRequestId'],
  },
});

export { stdoutMock };

export const logger = createLogger(
  {
    base: {
      environment: config.environment,
      version: config.version,
    },

    level: config.logLevel,

    mixin: () => ({
      ...lambdaContext.getStore(),
      ...recordContext.getStore(),
    }),

    name: config.name,

    transport:
      config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
  },
  destination,
);
