import { create } from './create';

describe('create', () => {
  const VAR = 'ABC_123_DEF_456';

  const parse = (value: string, _name: string) => JSON.parse(value);

  beforeEach(() => delete process.env[VAR]);

  describe('with default', () => {
    it('maps a set environment variable', () => {
      process.env[VAR] = '123';
      expect(create<number>(parse)(VAR, { default: undefined })).toBe(123);
    });

    it('throws on parsing error', () => {
      process.env[VAR] = '}';
      expect(() =>
        create(parse)(VAR, { default: undefined }),
      ).toThrowErrorMatchingInlineSnapshot(
        `"Unexpected token '}', "}" is not valid JSON"`,
      );
    });

    it('defaults on unset environment variable', () =>
      expect(create(parse)(VAR, { default: undefined })).toBeUndefined());
  });

  describe('without default', () => {
    it('maps a set environment variable', () => {
      process.env[VAR] = '123';
      expect(create<number>(parse)(VAR)).toBe(123);
    });

    it('throws on parsing error', () => {
      process.env[VAR] = '}';
      expect(() => create(parse)(VAR)).toThrowErrorMatchingInlineSnapshot(
        `"Unexpected token '}', "}" is not valid JSON"`,
      );
    });

    it('throws on unset environment variable', () =>
      expect(() => create(parse)(VAR)).toThrowErrorMatchingInlineSnapshot(
        `"process.env.ABC_123_DEF_456 is not set"`,
      ));
  });
});
