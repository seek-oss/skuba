import type { Patches } from '../../index.js';

import { tryUpgradeAwsSdkClientMockVitest } from './upgradeAwsSdkClientMockVitest.js';

export const patches: Patches = [
  {
    apply: tryUpgradeAwsSdkClientMockVitest,
    description: 'Upgrade aws-sdk-client-mock-vitest to 8.0.0',
  },
];
