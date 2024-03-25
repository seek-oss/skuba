import { create } from './create';
import * as parsers from './parsers';

/**
 * Read an environment variable as a non-negative integer.
 *
 * This includes (positive) zero.
 */
export const nonNegativeInteger = create(parsers.nonNegativeInteger);

/**
 * Create a function that reads an environment variable and validates it against
 * the provided array of choices.
 */
export const oneOf = <T>(choices: readonly T[]) =>
  create(parsers.oneOf(choices));

/**
 * Read an environment variable as a string.
 */
export const string = create(parsers.noop);

/**
 * Read an environment variable as a boolean.
 */
export const boolean = create(parsers.boolean);
