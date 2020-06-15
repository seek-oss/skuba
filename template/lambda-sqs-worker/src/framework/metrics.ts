import {
  createCloudWatchClient,
  createTimedSpan,
} from 'seek-datadog-custom-metrics';

import { config } from 'src/config';

export const metricsClient = createCloudWatchClient(config);

export const timedSpan = createTimedSpan(metricsClient);
