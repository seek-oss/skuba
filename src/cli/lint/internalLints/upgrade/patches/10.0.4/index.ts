import type { Patches } from '../..';

import { tryRemoveYarnIgnoreOptionalFlags } from './removeYarnIgnoreOptionalFlags';

export const patches: Patches = [
  {
    apply: tryRemoveYarnIgnoreOptionalFlags,
    description: 'Remove yarn --ignore-optional flags in Dockerfiles',
  },
];
