import path from 'path';
import fs from 'fs';

export const main = async () => {
  await fs.promises.access(path.join('.', 'a.ts'));

  console.log('I forgot to remove this')
};
