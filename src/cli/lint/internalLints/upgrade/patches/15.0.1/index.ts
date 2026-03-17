import type { Patches } from '../../index.js';

import { migrateToVitest } from './migrateToVitest.js';
import { tryRemovePnpmPlugin } from './removePnpmPlugin.js';

export const patches: Patches = [
  {
    apply: tryRemovePnpmPlugin,
    description: 'Remove pnpm-plugin-skuba',
  },
  {
    apply: migrateToVitest,
    description: 'Migrate to vitest',
  },
];
