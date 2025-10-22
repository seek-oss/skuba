import { describe, expect, test } from 'vitest';
import { diffDependencies } from './package.js';

describe('diffDependencies', () => {
  test.each([
    [
      'handles empty input',
      {
        old: {},
        new: {},
      },
      {},
    ],
    [
      'ignores a no-op',
      {
        old: {
          lodash: '1.0.0',
        },
        new: {
          lodash: '1.0.0',
        },
      },
      {},
    ],
    [
      'ignores undefined versions',
      {
        old: {
          lodash: undefined,
        },
        new: {
          ramda: undefined,
        },
      },
      {},
    ],
    [
      'finds a sole modification',
      {
        old: {
          lodash: '1.0.0',
        },
        new: {
          lodash: '1.0.1',
        },
      },
      {
        lodash: {
          operation: 'M',
          version: '1.0.0 -> 1.0.1',
        },
      },
    ],
    [
      'finds a sole addition',
      {
        old: {},
        new: {
          lodash: '1.0.0',
        },
      },
      {
        lodash: {
          operation: 'A',
          version: '1.0.0',
        },
      },
    ],
    [
      'finds a sole deletion',
      {
        old: {
          lodash: '1.0.0',
        },
        new: {},
      },
      {
        lodash: {
          operation: 'D',
          version: '1.0.0',
        },
      },
    ],
    [
      'handles a combination of changes',
      {
        old: {
          lodash: '1.0.0',
          ramda: '1.0.0',
          skuba: '1.0.1',
        },
        new: {
          lodash: '1.0.0',
          remeda: '1.0.0',
          skuba: '1.0.0',
        },
      },
      {
        ramda: {
          operation: 'D',
          version: '1.0.0',
        },
        remeda: {
          operation: 'A',
          version: '1.0.0',
        },
        skuba: {
          operation: 'M',
          version: '1.0.1 -> 1.0.0',
        },
      },
    ],
  ])('%s', (_, input, expected) =>
    expect(diffDependencies(input)).toEqual(expected),
  );
});
