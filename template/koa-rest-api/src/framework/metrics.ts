import { StatsD } from 'hot-shots';
import { createStatsDClient } from 'seek-datadog-custom-metrics';

import { logger } from './logging.js';

import { config } from '#src/config.js';

/* istanbul ignore next: StatsD client is not our responsibility */
export const metricsClient = createStatsDClient(StatsD, config, (err) =>
  logger.error({ err }, 'StatsD error'),
);
