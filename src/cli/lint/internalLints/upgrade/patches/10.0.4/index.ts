import type { Patches } from '../../index.js';

import { tryRemoveYarnIgnoreOptionalFlags } from './removeYarnIgnoreOptionalFlags.js';

export const patches: Patches = [
  {
    apply: tryRemoveYarnIgnoreOptionalFlags,
    description: 'Remove yarn --ignore-optional flags in Dockerfiles',
  },
];
