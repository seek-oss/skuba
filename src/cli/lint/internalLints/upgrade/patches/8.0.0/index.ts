import type { Patches } from '../../index.js';

import { tryPatchPnpmPackageManager } from './patchPnpmPackageManager.js';

export const patches: Patches = [
  {
    apply: tryPatchPnpmPackageManager,
    description:
      'Ensure the pnpm package manager version specified in package.json is used in Dockerfiles',
  },
];
