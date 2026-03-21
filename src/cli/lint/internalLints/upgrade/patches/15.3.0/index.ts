import type { Patches } from '../../index.js';

import { tryMigrateToVitest } from './migrateToVitest.js';

export const patches: Patches = [
  {
    apply: tryMigrateToVitest,
    description: 'Migrate to Vitest',
  },
];
