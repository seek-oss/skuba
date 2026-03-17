import type { Patches } from '../../index.js';

import { migrateToVitest } from './migrateToVitest.js';

export const patches: Patches = [
  {
    apply: migrateToVitest,
    description: 'Migrate to vitest',
  },
];
