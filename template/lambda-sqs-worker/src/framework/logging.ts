import { Context } from 'aws-lambda';
import pino from 'pino';

import { config } from 'src/config';

export type { Logger } from 'pino';

export const rootLogger = pino({
  base: {
    environment: config.environment,
    region: config.region,
    version: config.version,
  },

  level: config.logLevel,

  name: config.name,

  prettyPrint: config.environment === 'local',

  redact: {
    censor: '🤿 REDACTED 🚩',
    paths: [
      'err.config.agent',
      'err.config.headers.Authorization',
      'err.config.headers.authorization',
      'err.config.sockets',
      'err.request.headers.authorization',
      'err.request.config.headers.Authorization',
      'err.request.config.headers.authorization',
      'err.response.config.headers.Authorization',
      'err.response.config.headers.authorization',
      'err.response.headers.authorization',
      'err.response.request.headers.authorization',
    ],
  },

  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

/* istanbul ignore next: pino interface */
export const contextLogger = ({ awsRequestId }: Context) =>
  rootLogger.child({ awsRequestId });
