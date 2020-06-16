import { Context } from 'koa';
import pino from 'pino';
import { RequestLogging } from 'seek-koala';

import { config } from 'src/config';

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
      'err.config.headers.Authorization',
      'err.config.headers.authorization',
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

export const contextLogger = (ctx: Context) =>
  rootLogger.child(RequestLogging.contextFields(ctx));
