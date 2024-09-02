import { StatsD } from 'hot-shots';
import { createStatsDClient } from 'seek-datadog-custom-metrics';

import { config } from 'src/config';

import { logger } from './logging';

/* istanbul ignore next: StatsD client is not our responsibility */
export const metricsClient = createStatsDClient(StatsD, config, (err) =>
  logger.error({ err }, 'StatsD error'),
);
