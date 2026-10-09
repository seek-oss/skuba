import type { Patches } from '../../index.js';

import { tryMigrateImportOrderEslintDisables } from './migrateImportOrderEslintDisables.js';
import { tryMigratePrettierToOxfmt } from './migratePrettierToOxfmt.js';
import { tryMigrateSubpathImportExtensions } from './migrateSubpathImportExtensions.js';
import { tryMigrateVscodePrettierToOxc } from './migrateVscodePrettierToOxc.js';
import { tryPatchAttwNode16 } from './patchAttwNode16.js';
import { tryPatchSeekLoggerCreateLogger } from './patchSeekLoggerCreateLogger.js';
import { tryUpgradeAwsSdkClientMockVitest } from './upgradeAwsSdkClientMockVitest.js';

export const patches: Patches = [
  {
    apply: tryUpgradeAwsSdkClientMockVitest,
    description: 'Upgrade aws-sdk-client-mock-vitest to 8.0.0',
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
  {
    apply: tryMigrateSubpathImportExtensions,
    description: 'Strip .js and .ts extensions from subpath imports',
  },
];
