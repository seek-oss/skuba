import { describe, expect, it } from 'vitest';
import { seekKoala } from './seekKoala.js';

describe('seekKoala', () => {
  it('passes through up-to-date dependencies', () => {
    const input = {
      dependencies: {
        'seek-koala': '1.0.0',
      },
      devDependencies: {
        'seek-koala': '1.0.0',
      },
      type: 'application' as const,
    };

    const result = seekKoala(input);

    expect(result).toHaveLength(0);
    expect(input).toEqual({
      dependencies: {
        'seek-koala': '1.0.0',
      },
      devDependencies: {
        'seek-koala': '1.0.0',
      },
      type: 'application',
    });
  });

  it('replaces outdated dependencies', () => {
    const input = {
      dependencies: {
        '@seek/koala': '1.0.0',
      },
      devDependencies: {
        '@seek/koala': '1.0.0',
      },
      type: 'application' as const,
    };

    const result = seekKoala(input);

    expect(result).toHaveLength(1);
    expect(input).toEqual({
      dependencies: {
        'seek-koala': '*',
      },
      devDependencies: {
        'seek-koala': '*',
      },
      type: 'application',
    });
  });
});
