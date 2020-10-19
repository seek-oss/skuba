import createLogger from '@seek/logger';
import { Context } from 'koa';
import { RequestLogging } from 'seek-koala';

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

export const contextLogger = (ctx: Context) =>
  rootLogger.child(RequestLogging.contextFields(ctx));
