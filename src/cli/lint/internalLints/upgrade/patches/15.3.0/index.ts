import type { Patches } from '../../index.js';

import { tryMigrateToESM } from './migrateToESM.js';
import { tryPatchDockerfilePruneProd } from './patchDockerfilePruneProd.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfilePruneProd,
    description:
      'Replace pnpm install --prod with pnpm prune --prod in Dockerfiles',
  },
  {
    apply: tryMigrateToESM,
    description: 'Migrate to ESM',
  },
];
