import type { Patches } from '../../index.ts';

import { tryMigrateToPnpmConfig } from './migrateToPnpmConfig.ts';
import { tryPatchPackageBuilds } from './patchPackageBuilds.ts';

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
