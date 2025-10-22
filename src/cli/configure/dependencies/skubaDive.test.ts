import { describe, expect, it } from 'vitest';

import { skubaDive } from './skubaDive.js';

describe('skubaDive', () => {
  it('passes through up-to-date dependencies', () => {
    const input = {
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {},
      type: 'application' as const,
    };

    const result = skubaDive(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {},
      type: 'application',
    });
  });

  it('moves up-to-date dev dependency to dependency', () => {
    const input = {
      dependencies: {},
      devDependencies: {
        'skuba-dive': '1.0.0',
      },
      type: 'application' as const,
    };

    const result = skubaDive(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {},
      type: 'application',
    });
  });

  it('replaces outdated dependencies', () => {
    const input = {
      dependencies: {
        '@seek/skuba-dive': '1.0.0',
      },
      devDependencies: {
        '@seek/skuba-dive': '1.0.0',
      },
      type: 'application' as const,
    };

    const result = skubaDive(input);

    expect(result).toHaveLength(1);
    expect(input).toEqual({
      dependencies: {
        'skuba-dive': '*',
      },
      devDependencies: {},
      type: 'application',
    });
  });

  it('strips many things from packages', () => {
    const input = {
      dependencies: {
        'skuba-dive': '1.0.0',
        '@seek/skuba-dive': '1.0.0',
        lodash: '1.0.0',
        'module-alias': '1.0.0',
      },
      devDependencies: {
        'source-map-support': '1.0.0',
        'skuba-dive': '1.0.0',
        '@seek/skuba-dive': '1.0.0',
        nock: '1.0.0',
      },
      type: 'package' as const,
    };

    const result = skubaDive(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        lodash: '1.0.0',
      },
      devDependencies: {
        nock: '1.0.0',
      },
      type: 'package',
    });
  });
});
