import { createCloudWatchClient } from '@seek/node-datadog-custom-metrics';

import { config } from 'src/config';

export const metricsClient = createCloudWatchClient(config);
