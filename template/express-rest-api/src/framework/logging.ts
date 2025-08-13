import { createLogger } from '@seek/logger';

import { config } from '#src/config.js';

export const logger = createLogger({
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

  transport:
    config.deployment === 'local' ? { target: 'pino-pretty' } : undefined,
});
