import type { Patches } from '../../index.js';

import { tryAddSeekPackageRegistry } from './addSeekPackageRegistry.js';
import { tryPatchTsconfig } from './patchTsconfig.js';
import { pruneDevDeps } from './pruneDevDeps.js';

export const patches: Patches = [
  {
    apply: tryAddSeekPackageRegistry,
    description: 'Add SEEK registry to .npmrc files for SEEK-Jobs repositories',
  },
  {
    apply: pruneDevDeps,
    description: 'Add multi stage builds to api Dockerfiles',
  },
  {
    apply: tryPatchTsconfig,
    description: 'Remove baseUrl from tsconfig.json',
  },
];
