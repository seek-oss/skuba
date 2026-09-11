import type { Patches } from '../../index.js';

import { tryMigrateToESM } from './migrateToESM.js';
import { tryRemovePnpmConfigPackageJson } from './removePnpmConfigPackageJson.js';

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
