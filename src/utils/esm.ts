import path from 'path';
import { fileURLToPath } from 'url';

export const dirname = (importMeta: ImportMeta) => {
  const __filename = fileURLToPath(importMeta.url);

  return path.dirname(__filename);
};
