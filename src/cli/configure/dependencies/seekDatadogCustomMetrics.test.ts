import { describe, expect, it } from 'vitest';
import { seekDatadogCustomMetrics } from './seekDatadogCustomMetrics.js';

describe('seekDatadogCustomMetrics', () => {
  it('passes through up-to-date dependencies', () => {
    const input = {
      dependencies: {
        'seek-datadog-custom-metrics': '1.0.0',
      },
      devDependencies: {
        'seek-datadog-custom-metrics': '1.0.0',
      },
      type: 'application' as const,
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
      type: 'application',
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
      type: 'application' as const,
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
      type: 'application',
    });
  });
});
