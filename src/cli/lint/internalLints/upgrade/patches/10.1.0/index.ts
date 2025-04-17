import type { Patches } from '../..';

import { tryMigrateNpmrcToPnpmWorkspace } from './migrateNpmrcToPnpmWorkspace';
import { tryStopBundlingInCDKTests } from './stopBundlingInCDKTests';

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
