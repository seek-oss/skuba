import createLogger from '@seek/logger';

import { config } from 'src/config';

export const rootLogger = createLogger({
  base: {
    environment: config.environment,
    version: config.version,
  },

  level: config.logLevel,

  name: config.name,

  prettyPrint: config.environment === 'local',
});
