import type { Patches } from '../../index.js';

import { tryMigrateTsdown } from './migrateTsdown.js';

export const patches: Patches = [
  {
    apply: tryMigrateTsdown,
    description: 'Migrate tsdown config to 0.21',
  },
];
