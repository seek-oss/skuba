import { describe, expect, it } from 'vitest';
import { skubaDeps } from './skubaDeps.js';

describe('skubaDeps', () => {
  it('strips bundled dev dependencies', () => {
    const input = {
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {
        eslint: '0.0.1',
        'pino-pretty': '0.0.1',
        typescript: '0.0.1',
      },
      type: 'application' as const,
    };

    const result = skubaDeps(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {
        'pino-pretty': '0.0.1',
      },
      type: 'application',
    });
  });
});
