import { Assert } from 'skuba';

import * as metrics from 'src/framework/metrics';

export const metricsClient = {
  clear: () => (metrics.metricsClient.mockBuffer = []),

  expectTagSubset: (subset: string[], index: number = 0) => {
    const tags = metricsClient.tags(index);

    subset.forEach((tag) => expect(tags).toContain(tag));
  },

  tags: (index: number = 0) => {
    Assert.notNullish(metrics.metricsClient.mockBuffer);

    const line = metrics.metricsClient.mockBuffer[index];

    Assert.notNullish(line);

    const [, tagString] = line.split('#', 2);

    Assert.notNullish(tagString);

    return tagString.split(',');
  },
};
