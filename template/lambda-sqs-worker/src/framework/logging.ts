import createLogger from '@seek/logger';
import { Context } from 'aws-lambda';

import { config } from 'src/config';

export const rootLogger = createLogger({
  base: {
    environment: config.environment,
    version: config.version,
  },

  level: config.logLevel,

  name: config.name,

  transport:
    config.environment === 'local' ? { target: 'pino-pretty' } : undefined,
});

/* istanbul ignore next: @seek/logger interface */
export const contextLogger = ({ awsRequestId }: Context) =>
  rootLogger.child({ awsRequestId });
