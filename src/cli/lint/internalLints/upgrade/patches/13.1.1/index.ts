import type { Patches } from '../../index.ts';

import { tryPatchRootTsConfig } from './patchRootTsconfig.ts';
import { tryUpgradeNode } from './upgradeNode.ts';

export const patches: Patches = [
  {
    apply: tryUpgradeNode,
    description:
      'Upgrade Node.js version to 24 and package targets to Node.js 22.14.0+',
  },
  {
    apply: tryPatchRootTsConfig,
    description: "Add 'rootDir' to root tsconfig.json compilerOptions",
  },
];
