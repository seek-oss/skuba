import type { Patches } from '../..';

import { tryStopBundlingInCDKTests } from './stopBundlingInCDKTests';
import { tryClearNpmrcManagedSection } from './tryClearNpmrcManagedSection';

export const patches: Patches = [
  {
    apply: tryStopBundlingInCDKTests,
    description: 'Stop bundling inside CDK unit tests',
  },
  {
    apply: tryClearNpmrcManagedSection,
    description: 'Remove managed section from .npmrc',
  },
];
