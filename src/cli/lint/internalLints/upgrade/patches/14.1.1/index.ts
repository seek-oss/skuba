import type { Patches } from '../../index.js';

import { tryPatchPackageBuilds } from './patchPackageBuilds.js';

export const patches: Patches = [
  {
    apply: tryPatchPackageBuilds,
    description: 'Migrate packages build script to use tsdown',
  },
];
