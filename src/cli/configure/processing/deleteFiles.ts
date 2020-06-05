import { Module } from '../types';

/**
 * Load files into cache and schedule them for deletion.
 */
export const deleteFiles = (...filenames: string[]): Module =>
  Object.fromEntries(
    filenames.map((filename) => [filename, () => undefined] as const),
  );
