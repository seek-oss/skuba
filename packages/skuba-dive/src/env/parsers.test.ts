import * as parsers from './parsers';

describe('nonNegativeInteger', () => {
  const happyCases = [
    ['zero', '0', 0],
    ['one', '1', 1],
    ['max', '9007199254740991', 9007199254740991],
  ] as const;

  it.each(happyCases)('parses %s', (_, input, output) =>
    expect(parsers.nonNegativeInteger(input, 'PORT')).toBe(output),
  );

  const sadCases = [
    ['< min', '-9007199254740992'],
    ['min', '-9007199254740991'],
    ['negative one', '-1'],
    ['negative zero', '-0'],
    ['padded negative zero', '   -0   '],
    ['positive zero', '+0'],
    ['padded one', '   1   '],
    ['> max', '9007199254740992'],
    ['NaN', 'NaN'],
    ['string', 'string'],
    ['decimal', '1.1'],
    ['empty string', ''],
    ['whitespace string', '     '],
    ['infinity', 'Infinity'],
  ] as const;

  it.each(sadCases)('throws on %s', (_, input) =>
    expect(() => parsers.nonNegativeInteger(input, 'PORT')).toThrow(
      'process.env.PORT is not a non-negative integer',
    ),
  );
});

describe('noop', () => {
  it('passes through value', () =>
    expect(parsers.noop('abc', 'VERSION')).toBe('abc'));
});

describe('oneOf', () => {
  const parse = parsers.oneOf(['local', 'prod']);

  it('passes through value in list', () =>
    expect(parse('prod', 'ENVIRONMENT')).toBe('prod'));

  it('throws on value not in list', () =>
    expect(() =>
      parse('dev', 'ENVIRONMENT'),
    ).toThrowErrorMatchingInlineSnapshot(
      `"process.env.ENVIRONMENT is not a supported choice: 'dev'. Expected one of: ['local', 'prod']"`,
    ));
});

describe('boolean', () => {
  const happyCases = ['1', 'true', 'yes', 'on', 'enabled'];

  it.each(happyCases)('accepts %p', (input) =>
    expect(parsers.boolean(input)).toBe(true),
  );

  const sadCases = ['', 'false', 'no', 'off', '0', 'False', 'FALSE', 'n'];

  it.each(sadCases)('rejects %p', (input) =>
    expect(parsers.boolean(input)).toBe(false),
  );
});
