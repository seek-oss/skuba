import type { Patches } from '../../index.ts';

import { tryAddSeekPackageRegistry } from './addSeekPackageRegistry.ts';
import { tryPatchTsconfig } from './patchTsconfig.ts';
import { pruneDevDeps } from './pruneDevDeps.ts';

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
