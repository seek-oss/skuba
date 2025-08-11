import { StatsD } from 'hot-shots';
import { createStatsDClient } from 'seek-datadog-custom-metrics';

import { config } from 'src/config.js';

import { logger } from './logging.js';

/* istanbul ignore next: StatsD client is not our responsibility */
export const metricsClient = createStatsDClient(StatsD, config, (err) =>
  logger.error(err, 'StatsD error'),
);
