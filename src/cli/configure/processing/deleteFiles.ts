import type { Module } from '../types.js';

/**
 * Load files into cache and schedule them for deletion.
 */
export const deleteFiles = (...filenames: string[]): Module =>
  Object.fromEntries(
    filenames.map((filename) => [filename, () => undefined] as const),
  );
