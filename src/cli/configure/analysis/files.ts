import fs from 'fs';
import path from 'path';

import { isErrorWithCode } from '../../../utils/error';

export const tsFileExists = async (filePath: string) => {
  const ext = path.extname(filePath);

  if (ext !== '' && ext !== '.ts') {
    return false;
  }

  try {
    const stats = await fs.promises.lstat(
      ext === '' ? `${filePath}.ts` : filePath,
    );

    return stats.isFile();
  } catch (err: unknown) {
    if (isErrorWithCode(err, 'ENOENT')) {
      return false;
    }

    throw err;
  }
};
