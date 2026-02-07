import type { Patches } from '../../index.js';

import { tryMigrateToPnpmConfig } from './migrateToPnpmConfig.js';

export const patches: Patches = [
  {
    apply: tryMigrateToPnpmConfig,
    description: 'Migrate pnpm workspace to pnpm-plugin-skuba',
  },
];
