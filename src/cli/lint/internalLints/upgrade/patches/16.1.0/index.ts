import type { Patches } from '../../index.js';

import { patchDockerfiles } from './addMultistageBuilds.js';
import { tryPatchTsconfig } from './patchTsconfig.js';

export const patches: Patches = [
  {
    apply: patchDockerfiles,
    description: 'Add multi stage builds to api Dockerfiles',
  },
  {
    apply: tryPatchTsconfig,
    description: 'Remove baseUrl from tsconfig.json',
  },
];
