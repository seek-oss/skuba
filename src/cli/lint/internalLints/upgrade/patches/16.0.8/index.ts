import type { Patches } from '../../index.js';

import { tryPatchTsconfig } from './patchTsconfig.js';

export const patches: Patches = [
  {
    apply: tryPatchTsconfig,
    description: 'Remove baseUrl from tsconfig.json',
  },
];
