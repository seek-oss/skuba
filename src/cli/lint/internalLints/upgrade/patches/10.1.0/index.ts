import type { Patches } from '../../index.js';

import { tryMigrateNpmrcToPnpmWorkspace } from './migrateNpmrcToPnpmWorkspace.js';
import { tryStopBundlingInCDKTests } from './stopBundlingInCDKTests.js';

export const patches: Patches = [
  {
    apply: tryStopBundlingInCDKTests,
    description: 'Stop bundling inside CDK unit tests',
  },
  {
    apply: tryMigrateNpmrcToPnpmWorkspace,
    description: 'Move .npmrc config to pnpm-workspace.yaml',
  },
];
