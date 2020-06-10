import assert from 'assert';

/**
 * Check that a value is neither `null` nor `undefined`.
 */
export function notNullish<T>(value: T | null | undefined): asserts value is T {
  assert.notStrictEqual(value, null);
  assert.notStrictEqual(typeof value, 'undefined');
}
