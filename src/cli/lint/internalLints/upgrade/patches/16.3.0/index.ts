import type { Patches } from '../../index.ts';

import { tryMigrateImportOrderEslintDisables } from './migrateImportOrderEslintDisables.ts';
import { tryMigratePnpmV11 } from './migratePnpmV11.ts';
import { tryMigratePrettierToOxfmt } from './migratePrettierToOxfmt.ts';
import { tryMigrateVscodePrettierToOxc } from './migrateVscodePrettierToOxc.ts';
import { tryPatchAttwNode16 } from './patchAttwNode16.ts';
import { tryPatchSeekLoggerCreateLogger } from './patchSeekLoggerCreateLogger.ts';
import { tryUpgradeAwsSdkClientMockVitest } from './upgradeAwsSdkClientMockVitest.ts';

export const patches: Patches = [
  {
    apply: tryMigratePnpmV11,
    description: 'Migrate pnpm v10 to v11',
  },
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
];
