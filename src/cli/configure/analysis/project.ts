import path from 'path';

import fs from 'fs-extra';

import { isErrorWithCode } from '../../../utils/error.js';

export const createDestinationFileReader =
  (root: string) =>
  async (filename: string): Promise<string | undefined> => {
    try {
      return await fs.promises.readFile(path.join(root, filename), 'utf8');
    } catch (err) {
      if (isErrorWithCode(err, 'ENOENT')) {
        return;
      }

      throw err;
    }
  };
