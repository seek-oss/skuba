import type { Patches } from '../../index.js';

import { tryPatchRootTsConfig } from './patchRootTsconfig.js';

export const patches: Patches = [
  {
    apply: tryPatchRootTsConfig,
    description: "Add 'rootDir' to root tsconfig.json compilerOptions",
  },
];
