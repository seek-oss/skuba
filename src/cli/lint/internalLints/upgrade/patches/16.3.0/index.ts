import type { Patches } from '../../index.js';

import { tryPatchAttwNode16 } from './patchAttwNode16.js';
import { tryUpgradeAwsSdkClientMockVitest } from './upgradeAwsSdkClientMockVitest.js';

export const patches: Patches = [
  {
    apply: tryUpgradeAwsSdkClientMockVitest,
    description: 'Upgrade aws-sdk-client-mock-vitest to 8.0.0',
  },
  {
    apply: tryPatchAttwNode16,
    description: 'Update tsdown attw: true to the node16 profile',
  },
];
