import { skuba } from './skuba';

describe('skuba', () => {
  it('passes through up-to-date dependencies', () => {
    const input = {
      dependencies: {},
      devDependencies: {
        skuba: '1.0.0',
      },
    };

    const result = skuba(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {},
      devDependencies: {
        skuba: '1.0.0',
      },
    });
  });

  it('moves up-to-date dependency to dev dependency', () => {
    const input = {
      dependencies: {
        skuba: '1.0.0',
      },
      devDependencies: {},
    };

    const result = skuba(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {},
      devDependencies: {
        skuba: '1.0.0',
      },
    });
  });

  it('replaces outdated dependencies', () => {
    const input = {
      dependencies: {
        '@seek/skuba': '1.0.0',
      },
      devDependencies: {
        '@seek/skuba': '1.0.0',
      },
    };

    const result = skuba(input);

    expect(result).toHaveLength(1);
    expect(input).toEqual({
      dependencies: {},
      devDependencies: {
        skuba: '*',
      },
    });
  });
});
