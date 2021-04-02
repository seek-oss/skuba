import { getFirstDefined, merge, mergeRaw } from './record.js';

describe('getFirstDefined', () => {
  it('handles no input', () => expect(getFirstDefined({}, [])).toBeUndefined());

  it('handles no keys', () =>
    expect(getFirstDefined({ a: 1 }, [])).toBeUndefined());

  it('handles no matches', () =>
    expect(getFirstDefined({ a: 1 }, ['b'])).toBeUndefined());

  it('handles single match', () =>
    expect(getFirstDefined({ a: 1 }, ['b', 'a', 'c'])).toBe(1));

  it('handles first match', () =>
    expect(getFirstDefined({ a: 1, b: 3, c: 2 }, ['b', 'a', 'c'])).toBe(3));
});

describe('merge', () => {
  it('concats, dedupes and sorts arrays', () =>
    expect(merge({ a: [1, 3] }, { a: [2, 4, 3] })).toStrictEqual({
      a: [1, 2, 3, 4],
    }));

  it('merges nested objects', () =>
    expect(
      merge({ a1: { b1: { c1: null } } }, { a1: { b1: {}, b2: true } }),
    ).toStrictEqual({ a1: { b1: { c1: null }, b2: true } }));
});

describe('mergeRaw', () => {
  it('concats arrays', () =>
    expect(mergeRaw({ a: [1, 3] }, { a: [2, 4, 3] })).toStrictEqual({
      a: [1, 3, 2, 4, 3],
    }));

  it('merges nested objects', () =>
    expect(
      mergeRaw({ a1: { b1: { c1: null } } }, { a1: { b1: {}, b2: true } }),
    ).toStrictEqual({ a1: { b1: { c1: null }, b2: true } }));
});
