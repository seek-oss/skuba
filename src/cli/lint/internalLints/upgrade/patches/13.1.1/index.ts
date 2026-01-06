import type { Patches } from '../../index.js';

import { tryMigrateToPnpmFile } from './migrateToPnpmFile.js';
import { tryPatchRootTsConfig } from './patchRootTsconfig.js';
import { tryUpgradeNode } from './upgradeNode.js';

export const patches: Patches = [
  {
    apply: tryMigrateToPnpmFile,
    description: 'Migrate pnpm workspace to .pnpmfile.cjs',
  },
  {
    apply: tryUpgradeNode,
    description:
      'Upgrade Node.js version to 24 and package targets to Node.js 20',
  },
  {
    apply: tryPatchRootTsConfig,
    description: "Add 'rootDir' to root tsconfig.json compilerOptions",
  },
];
