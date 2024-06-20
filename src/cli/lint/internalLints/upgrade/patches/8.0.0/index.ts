import type { Patches } from '../..';

import { tryPatchPnpmPackageManager } from './patchPnpmPackageManager';

export const patches: Patches = [
  {
    apply: tryPatchPnpmPackageManager,
    description:
      'Ensure the pnpm package manager version specified in package.json is used in Dockerfiles',
  },
];
