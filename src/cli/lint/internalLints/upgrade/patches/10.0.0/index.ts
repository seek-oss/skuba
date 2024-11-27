import type { Patches } from '../..';

import { tryUpgradeNode } from './upgradeNode';

export const patches: Patches = [
  {
    apply: tryUpgradeNode,
    description: 'TODO',
  },
];
