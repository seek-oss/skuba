import type { Patches } from '../..';

import { tryUpgradeESLint } from './upgradeESLint';

export const patches: Patches = [
  {
    apply: tryUpgradeESLint,
    description: 'Upgrade to ESLint flat config',
  },
];
