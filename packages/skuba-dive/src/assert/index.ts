import assert from 'assert';

/**
 * Assert that a value is either `null` or `undefined`.
 */
export function nullish<T>(
  value: T | null | undefined,
): asserts value is null | undefined {
  assert.strictEqual(typeof value === 'undefined' || value === null, true);
}

/**
 * Assert that a value is neither `null` nor `undefined`.
 */
export function notNullish<T>(value: T | null | undefined): asserts value is T {
  assert.notStrictEqual(value, null);
  assert.notStrictEqual(typeof value, 'undefined');
}

/**
 * Assert that a value is an object.
 */
export function object(
  value: unknown,
): asserts value is Record<PropertyKey, unknown> {
  assert.strictEqual(typeof value, 'object');
  assert.notStrictEqual(value, null);
}

/**
 * Assert that a value is an object with the given numeric property.
 */
export function numberProp<P extends PropertyKey>(
  value: unknown,
  prop: P,
): asserts value is Record<P, string> {
  object(value);
  assert.strictEqual(typeof value[prop], 'number');
}

/**
 * Assert that a value is an object with the given string property.
 */
export function stringProp<P extends PropertyKey>(
  value: unknown,
  prop: P,
): asserts value is Record<P, string> {
  object(value);
  assert.strictEqual(typeof value[prop], 'string');
}
