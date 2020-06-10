import { createCloudWatchClient } from 'seek-datadog-custom-metrics';

import { config } from 'src/config';

export const metricsClient = createCloudWatchClient(config);
