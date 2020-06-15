import { StatsD } from 'hot-shots';
import { createStatsDClient } from 'seek-datadog-custom-metrics';

import { config } from 'src/config';

import { rootLogger } from './logging';

/* istanbul ignore next: StatsD client is not our responsibility */
export const metricsClient = createStatsDClient(config, (err) =>
  rootLogger.error({ err }, 'StatsD error'),
) as StatsD;
