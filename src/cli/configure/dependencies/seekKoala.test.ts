import { seekKoala } from './seekKoala';

describe('seekKoala', () => {
  it('passes through up-to-date dependencies', () => {
    const input = {
      dependencies: {
        'seek-koala': '1.0.0',
      },
      devDependencies: {
        'seek-koala': '1.0.0',
      },
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
    });
  });
});
