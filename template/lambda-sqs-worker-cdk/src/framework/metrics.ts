import { sendDistributionMetric } from 'datadog-lambda-js';

import { config } from 'src/config.js';

const prefix = `${config.service}.`;

export const metricsClient = {
  distribution: (
    ...[name, ...rest]: Parameters<typeof sendDistributionMetric>
  ) =>
    config.metrics
      ? sendDistributionMetric(`${prefix}${name}`, ...rest)
      : undefined,
};
