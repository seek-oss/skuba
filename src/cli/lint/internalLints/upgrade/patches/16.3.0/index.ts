import type { Patches } from '../../index.js';

import { tryMigrateImportOrderEslintDisables } from './migrateImportOrderEslintDisables.js';
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
  {
    apply: tryMigrateImportOrderEslintDisables,
    description:
      'Replace import-x/order ESLint disables with oxfmt-ignore comments',
  },
];
