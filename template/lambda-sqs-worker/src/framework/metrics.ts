import { sendDistributionMetric } from 'datadog-lambda-js';

import { config } from 'src/config';

const prefix = `${config.name}.`;

export const metricsClient = {
  distribution: (
    ...[name, ...rest]: Parameters<typeof sendDistributionMetric>
  ) =>
    config.metrics
      ? sendDistributionMetric(`${prefix}${name}`, ...rest)
      : undefined,
};
