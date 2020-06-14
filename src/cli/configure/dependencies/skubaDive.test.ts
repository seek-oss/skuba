import { skubaDive } from './skubaDive';

describe('skubaDive', () => {
  it('passes through up-to-date dependencies', () => {
    const input = {
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {},
    };

    const result = skubaDive(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {},
    });
  });

  it('moves up-to-date dev dependency to dependency', () => {
    const input = {
      dependencies: {},
      devDependencies: {
        'skuba-dive': '1.0.0',
      },
    };

    const result = skubaDive(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        'skuba-dive': '1.0.0',
      },
      devDependencies: {},
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
    };

    const result = skubaDive(input);

    expect(result).toHaveLength(1);
    expect(input).toEqual({
      dependencies: {
        'skuba-dive': '*',
      },
      devDependencies: {},
    });
  });
});
