import type { Patches } from '../../index.js';

import { tryMigrateToESM } from './migrateToESM.js';

export const patches: Patches = [
  {
    apply: tryMigrateToESM,
    description: 'Migrate to ESM',
  },
];
