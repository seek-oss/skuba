import type { Patches } from '../..';

import { tryCollapseDuplicateMergeKeys } from './collapseDuplicateMergeKeys';
import { tryUpgradeESLint } from './upgradeESLint';

export const patches: Patches = [
  {
    apply: tryCollapseDuplicateMergeKeys,
    description: 'Collapse duplicate merge keys in .buildkite files',
  },
  {
    apply: tryUpgradeESLint,
    description: 'Upgrade to ESLint flat config',
  },
];
