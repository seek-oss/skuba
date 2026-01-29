import type { Patches } from '../../index.js';

import { tryMigrateToPnpmConfig } from './migrateToPnpmConfig.js';
import { tryPatchRootTsConfig } from './patchRootTsconfig.js';
import { tryUpgradeNode } from './upgradeNode.js';

export const patches: Patches = [
  {
    apply: tryMigrateToPnpmConfig,
    description: 'Migrate pnpm workspace to pnpm-plugin-skuba',
  },
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
