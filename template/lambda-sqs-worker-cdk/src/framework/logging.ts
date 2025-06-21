import { AsyncLocalStorage } from 'async_hooks';

import createLogger, {
  createDestination,
  createLambdaContextTracker,
  lambdaContextStorageProvider,
} from '@seek/logger';

import { config } from 'src/config';

interface LoggerContext {
  awsRequestId: string;
  sqsMessageId: string;
}

export const withRequest = createLambdaContextTracker();

export const loggerContext = new AsyncLocalStorage<LoggerContext>();

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
      ...lambdaContextStorageProvider.getContext(),
      ...loggerContext.getStore(),
    }),

    name: config.name,

    transport:
      config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
  },
  destination,
);
