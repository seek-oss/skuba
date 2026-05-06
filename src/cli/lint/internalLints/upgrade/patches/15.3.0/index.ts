import type { Patches } from '../../index.js';

import { tryMigrateToVitest } from './migrateToVitest.js';
import { tryPatchDockerfilePruneProd } from './patchDockerfilePruneProd.js';
import { tryRemovePnpmConfigPackageJson } from './removePnpmConfigPackageJson.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfilePruneProd,
    description:
      'Replace pnpm install --prod with pnpm prune --prod in Dockerfiles',
  },
  {
    apply: tryRemovePnpmConfigPackageJson,
    description: 'Remove pnpm-plugin-skuba from package.json pnpm config',
  },
  {
    apply: tryMigrateToVitest,
    description: 'Migrate to Vitest',
  },
];
