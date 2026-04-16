import type { Patches } from '../../index.js';

import { tryMigrateToVitest } from './migrateToVitest.js';
import { tryPatchDockerfilePruneProd } from './patchDockerfilePruneProd.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfilePruneProd,
    description:
      'Replace pnpm install --prod with pnpm prune --prod in Dockerfiles',
  },
  {
    apply: tryMigrateToVitest,
    description: 'Migrate to Vitest',
  },
];
