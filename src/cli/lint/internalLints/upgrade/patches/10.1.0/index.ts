import type { Patches } from '../..';

import { tryStopBundlingInCDKTests } from './stopBundlingInCDKTests';

export const patches: Patches = [
  {
    apply: tryStopBundlingInCDKTests,
    description: 'Stop bundling inside CDK unit tests',
  },
];
