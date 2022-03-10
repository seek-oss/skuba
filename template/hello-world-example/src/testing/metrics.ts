import * as metrics from 'src/framework/metrics';

function assertDefined<T>(value: T | undefined): asserts value is T {
  expect(value).toBeDefined();
}

export const metricsClient = {
  clear: () => (metrics.metricsClient.mockBuffer = []),

  expectTagSubset: (subset: string[], index: number = 0) => {
    const tags = metricsClient.tags(index);

    subset.forEach((tag) => expect(tags).toContain(tag));
  },

  tags: (index: number = 0) => {
    assertDefined(metrics.metricsClient.mockBuffer);

    const line = metrics.metricsClient.mockBuffer[index];

    assertDefined(line);

    const [, tagString] = line.split('#', 2);

    assertDefined(tagString);

    return tagString.split(',');
  },
};
