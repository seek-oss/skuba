import type { Patches } from '../../index.js';

import { tryMigrateToPnpmConfig } from './migrateToPnpmConfig.js';
import { tryPatchPackageBuilds } from './patchPackageBuilds.js';

export const patches: Patches = [
  {
    apply: tryMigrateToPnpmConfig,
    description: 'Migrate pnpm workspace to pnpm-plugin-skuba',
  },
  {
    apply: tryPatchPackageBuilds,
    description: 'Migrate npm package builds to tsdown',
  },
];
