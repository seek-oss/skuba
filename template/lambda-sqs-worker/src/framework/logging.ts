import createLogger from '@seek/logger';
import { Context } from 'aws-lambda';

import { config } from 'src/config';

export const rootLogger = createLogger({
  base: {
    environment: config.environment,
    region: config.region,
    version: config.version,
  },

  level: config.logLevel,

  name: config.name,

  prettyPrint: config.environment === 'local',
});

/* istanbul ignore next: @seek/logger interface */
export const contextLogger = ({ awsRequestId }: Context) =>
  rootLogger.child({ awsRequestId });
