import type { Module } from '../types.js';

/**
 * Load files into cache to perform side effects in another module.
 */
export const loadFiles = (...filenames: string[]): Module =>
  Object.fromEntries(
    filenames.map((filename) => [filename, (file?: string) => file] as const),
  );
