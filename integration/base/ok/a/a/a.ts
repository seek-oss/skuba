// Imports in order
import fs from 'fs';
import path from 'path';

export const main = async () => {
  await fs.promises.access(path.join('.', 'a.ts'));
};
