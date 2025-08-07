import { readTsconfig } from '../cli/build/tsc.js';

import { log } from './logging.js';

/**
 * Extract custom conditions from tsconfig that should be passed to tsx
 */
export const getCustomConditions = (): string[] => {
  try {
    const parsedConfig = readTsconfig([], log);
    const customConditions = parsedConfig?.options.customConditions;
    return Array.isArray(customConditions) ? customConditions : [];
  } catch {
    return [];
  }
};
