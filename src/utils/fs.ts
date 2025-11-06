import fs from 'fs-extra';

import { isErrorWithCode } from './error.js';

export const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);

    return true; // Path exists and is accessible
  } catch (error: unknown) {
    if (isErrorWithCode(error, 'ENOENT')) {
      return false; // Path does not exist
    }

    throw error; // Other errors (include permission issues)
  }
};
