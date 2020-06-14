import { seekDatadogCustomMetrics } from './seekDatadogCustomMetrics';

describe('seekDatadogCustomMetrics', () => {
  it('passes through up-to-date dependencies', () => {
    const input = {
      dependencies: {
        'seek-datadog-custom-metrics': '1.0.0',
      },
      devDependencies: {
        'seek-datadog-custom-metrics': '1.0.0',
      },
    };

    const result = seekDatadogCustomMetrics(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        'seek-datadog-custom-metrics': '1.0.0',
      },
      devDependencies: {
        'seek-datadog-custom-metrics': '1.0.0',
      },
    });
  });

  it('replaces outdated dependencies', () => {
    const input = {
      dependencies: {
        '@seek/node-datadog-custom-metrics': '1.0.0',
      },
      devDependencies: {
        '@seek/node-datadog-custom-metrics': '1.0.0',
      },
    };

    const result = seekDatadogCustomMetrics(input);

    expect(result).toHaveLength(1);
    expect(input).toEqual({
      dependencies: {
        'seek-datadog-custom-metrics': '*',
      },
      devDependencies: {
        'seek-datadog-custom-metrics': '*',
      },
    });
  });
});
