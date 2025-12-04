import type { Patches } from '../../index.js';

import { tryUpgradeNode } from './upgradeNode.js';

export const patches: Patches = [
  {
    apply: tryUpgradeNode,
    description:
      'Upgrade Node.js version to 24 and ECMAScript version to ES2025',
  },
];
