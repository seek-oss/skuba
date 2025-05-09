import type { Patches } from '../..';

import { tryMoveConfigToSkubaConfigTs } from './moveConfigToSkubaConfigTs';
import { tryStopBundlingInCDKTests } from './stopBundlingInCDKTests';

export const patches: Patches = [
  {
    apply: tryMoveConfigToSkubaConfigTs,
    description: 'Move config from package.json to skuba.config.ts',
  },
  {
    apply: tryStopBundlingInCDKTests,
    description: 'Stop bundling inside CDK unit tests',
  },
];
