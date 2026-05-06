import type { Patches } from '../../index.js';

import { tryMigrateToESM } from './migrateToESM.js';
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
    apply: tryMigrateToESM,
    description: 'Migrate to ESM',
  },
];
