import type { Patches } from '../..';

import { tryUpgradeNode } from './upgradeNode';

export const patches: Patches = [
  {
    apply: tryUpgradeNode,
    description: 'Upgrades Node.js to version 22',
  },
];
