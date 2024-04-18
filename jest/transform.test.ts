import { transform } from './transform';

test('transform', () =>
  expect(transform).toStrictEqual({
    '^.+\\.tsx?$': [
      expect.stringMatching(
        /\/skuba\/node_modules\/.*\/?ts-jest\/dist\/index\.js$/,
      ),
      {
        isolatedModules: true,
      },
    ],
  }));
