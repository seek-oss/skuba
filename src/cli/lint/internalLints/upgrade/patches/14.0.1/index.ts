import type { Patches } from '../../index.js';

import { tryPatchBuildTsConfig } from './patchBuildTsconfig.js';
import { tryPatchPackageBuilds } from './patchPackageBuilds.js';

export const patches: Patches = [
  {
    apply: tryPatchBuildTsConfig,
    description: "Add 'rootDir' to tsconfig.build.json compilerOptions",
  },
  {
    apply: tryPatchPackageBuilds,
    description: 'Migrate packages build script to use tsdown',
  },
];
