import type { Patches } from '../../index.ts';

import { tryMigrateTsdown } from './migrateTsdown.ts';

export const patches: Patches = [
  {
    apply: tryMigrateTsdown,
    description: 'Migrate tsdown config to 0.21',
  },
];
