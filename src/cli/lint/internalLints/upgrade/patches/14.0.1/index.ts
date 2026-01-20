import type { Patches } from '../../index.js';

import { tryPatchBuildTsConfig } from './patchBuildTsconfig.js';

export const patches: Patches = [
  {
    apply: tryPatchBuildTsConfig,
    description: "Add 'rootDir' to tsconfig.build.json compilerOptions",
  },
];
