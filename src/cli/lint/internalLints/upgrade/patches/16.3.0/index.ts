import type { Patches } from '../../index.js';

import { tryMigratePrettierToOxfmt } from './migratePrettierToOxfmt.js';
import { tryMigrateVscodePrettierToOxc } from './migrateVscodePrettierToOxc.js';
import { tryPatchAttwNode16 } from './patchAttwNode16.js';

export const patches: Patches = [
  {
    apply: tryPatchAttwNode16,
    description: 'Update tsdown attw: true to the node16 profile',
  },
  {
    apply: tryMigratePrettierToOxfmt,
    description: 'Migrate Prettier config to Oxfmt',
  },
  {
    apply: tryMigrateVscodePrettierToOxc,
    description: 'Replace Prettier VS Code recommendation with Oxc',
  },
];
