import type { Patches } from '../../index.js';

import { tryMigratePrettierToOxfmt } from './migratePrettierToOxfmt.js';
import { tryMigrateVscodePrettierToOxc } from './migrateVscodePrettierToOxc.js';

export const patches: Patches = [
  {
    apply: tryMigratePrettierToOxfmt,
    description: 'Migrate Prettier config to Oxfmt',
  },
  {
    apply: tryMigrateVscodePrettierToOxc,
    description: 'Replace Prettier VS Code recommendation with Oxc',
  },
];
