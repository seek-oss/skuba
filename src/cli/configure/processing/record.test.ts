import { describe, expect, it } from 'vitest';
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
  it('concats, dedupes and sorts arrays', () => {
    const target = { a: [1, 3] };
    const source = { a: [2, 4, 3] };
    expect(merge(target, source)).toStrictEqual({
      a: [1, 2, 3, 4],
    });
    expect(target).toStrictEqual({ a: [1, 3] });
    expect(source).toStrictEqual({ a: [2, 4, 3] });
  });

  it('merges nested objects', () => {
    const target = { a1: { b1: { c1: null } } };
    const source = { a1: { b1: {}, b2: true } };
    expect(merge(target, source)).toStrictEqual({
      a1: { b1: { c1: null }, b2: true },
    });
    expect(target).toStrictEqual({ a1: { b1: { c1: null } } });
    expect(source).toStrictEqual({ a1: { b1: {}, b2: true } });
  });
});

describe('mergeRaw', () => {
  it('concats arrays', () => {
    const target = { a: [1, 3] };
    const source = { a: [2, 4, 3] };
    expect(mergeRaw(target, source)).toStrictEqual({
      a: [1, 3, 2, 4, 3],
    });
    expect(target).toStrictEqual({ a: [1, 3] });
    expect(source).toStrictEqual({ a: [2, 4, 3] });
  });

  it('merges nested objects', () => {
    const target = { a1: { b1: { c1: null } } };
    const source = { a1: { b1: {}, b2: true } };
    expect(mergeRaw(target, source)).toStrictEqual({
      a1: { b1: { c1: null }, b2: true },
    });
    expect(target).toStrictEqual({ a1: { b1: { c1: null } } });
    expect(source).toStrictEqual({ a1: { b1: {}, b2: true } });
  });
});
