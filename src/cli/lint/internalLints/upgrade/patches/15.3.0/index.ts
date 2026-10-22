import type { Patches } from '../../index.ts';

import { tryMigrateToESM } from './migrateToESM.ts';
import { tryRemovePnpmConfigPackageJson } from './removePnpmConfigPackageJson.ts';

export const patches: Patches = [
  {
    apply: tryRemovePnpmConfigPackageJson,
    description: 'Remove pnpm-plugin-skuba from package.json pnpm config',
  },
  {
    apply: tryMigrateToESM,
    description: 'Migrate to ESM',
  },
];
