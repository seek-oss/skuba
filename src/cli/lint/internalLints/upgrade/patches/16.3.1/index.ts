import type { Patches } from '../../index.js';

import { tryMigrateImportExtensions } from './migrateImportExtensions.js';

export const patches: Patches = [
  {
    apply: tryMigrateImportExtensions,
    description:
      'Strip .js and .ts extensions from subpath imports and use .ts extensions for relative imports',
  },
];
