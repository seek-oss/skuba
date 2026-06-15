import { skuba } from './skuba.js';

describe('skuba', () => {
  it.each([
    [
      'forces latest dev dependency',
      {
        dependencies: {},
        devDependencies: {
          skuba: '1.0.0',
        },
      },
    ],
    [
      'adds dev dependency',
      {
        dependencies: {},
        devDependencies: {},
      },
    ],
    [
      'moves dependency',
      {
        dependencies: {
          skuba: '1.0.0',
        },
        devDependencies: {},
      },
    ],
    [
      'replaces outdated dependencies',
      {
        dependencies: {
          '@seek/skuba': '1.0.0',
        },
        devDependencies: {
          '@seek/skuba': '1.0.0',
        },
      },
      true,
    ],
  ])('%s', (_, input, expectReplacement = false) => {
    const result = skuba({ ...input, type: 'application' });

    expect(result).toHaveLength(expectReplacement ? 1 : 0);
    expect(input).toEqual({
      dependencies: {},
      devDependencies: {
        skuba: '*',
      },
    });
  });
});
