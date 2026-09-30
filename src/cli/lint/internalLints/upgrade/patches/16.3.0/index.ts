import type { Patches } from '../../index.js';

import { tryMigrateImportOrderEslintDisables } from './migrateImportOrderEslintDisables.js';
import { tryMigratePnpmV11 } from './migratePnpmV11.js';
import { tryMigratePrettierToOxfmt } from './migratePrettierToOxfmt.js';
import { tryMigrateVscodePrettierToOxc } from './migrateVscodePrettierToOxc.js';
import { tryPatchAttwNode16 } from './patchAttwNode16.js';
import { tryPatchSeekLoggerCreateLogger } from './patchSeekLoggerCreateLogger.js';

export const patches: Patches = [
  {
    apply: tryMigratePnpmV11,
    description: 'Migrate pnpm v10 to v11',
  },
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
  {
    apply: tryMigrateImportOrderEslintDisables,
    description:
      'Replace import-x/order ESLint disables with oxfmt-ignore comments',
  },
  {
    apply: tryPatchSeekLoggerCreateLogger,
    description:
      'Migrate default imports from @seek/logger to named createLogger imports',
  },
];
