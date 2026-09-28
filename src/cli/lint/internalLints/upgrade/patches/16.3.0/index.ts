import type { Patches } from '../../index.js';

import { tryPatchAttwNode16 } from './patchAttwNode16.js';

export const patches: Patches = [
  {
    apply: tryPatchAttwNode16,
    description: 'Update tsdown attw: true to the node16 profile',
  },
];
