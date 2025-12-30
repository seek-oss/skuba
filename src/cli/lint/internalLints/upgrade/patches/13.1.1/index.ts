import type { Patches } from '../../index.js';

import { tryPatchPackageBuilds } from './patchPackageBuilds.js';
import { tryPatchRootTsConfig } from './patchRootTsconfig.js';
import { tryUpgradeNode } from './upgradeNode.js';

export const patches: Patches = [
  {
    apply: tryUpgradeNode,
    description:
      'Upgrade Node.js version to 24 and package targets to Node.js 20',
  },
  {
    apply: tryPatchRootTsConfig,
    description: "Add 'rootDir' to root tsconfig.json compilerOptions",
  },
  {
    apply: tryPatchPackageBuilds,
    description: 'Migrate packages build script to use tsdown',
  },
];
