import createLogger from '@seek/logger';
import { RequestLogging } from 'seek-koala';

import { config } from 'src/config';
import { Context } from 'src/types/koa';

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

export const contextLogger = (ctx: Context) =>
  rootLogger.child(RequestLogging.contextFields(ctx));
