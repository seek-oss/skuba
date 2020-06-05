import path from 'path';

import fs from 'fs-extra';

export const tsFileExists = async (filePath: string) => {
  const ext = path.extname(filePath);

  if (ext !== '' && ext !== '.ts') {
    return false;
  }

  try {
    const stats = await fs.lstat(ext === '' ? `${filePath}.ts` : filePath);

    return stats.isFile();
  } catch (err) {
    if (err?.code === 'ENOENT') {
      return false;
    }

    throw err;
  }
};
