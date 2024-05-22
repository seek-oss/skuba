import { create } from './create';
import * as parsers from './parsers';

/**
 * Read an AWS Secrets manager secret as a string.
 */
export const string = create(parsers.string);

/**
 * Read an AWS Secrets manager secret as a binary.
 */
export const binary = create(parsers.binary);
