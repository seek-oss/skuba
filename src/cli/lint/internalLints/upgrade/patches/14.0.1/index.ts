import type { Patches } from '../../index.ts';

import { tryPatchBuildTsConfig } from './patchBuildTsconfig.ts';

export const patches: Patches = [
  {
    apply: tryPatchBuildTsConfig,
    description: "Add 'rootDir' to tsconfig.build.json compilerOptions",
  },
];
