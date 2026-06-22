import type { Patches } from '../../index.js';

import { tryMigratePnpmV11 } from './migratePnpmV11.js';

export const patches: Patches = [
  {
    apply: tryMigratePnpmV11,
    description: 'Migrate pnpm v10 to v11',
  },
];
