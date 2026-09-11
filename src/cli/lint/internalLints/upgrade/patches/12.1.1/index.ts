import type { Patches } from '../../index.js';

import { tryPatchJestSnapshots } from './patchJestSnapshots.js';

export const patches: Patches = [
  {
    apply: tryPatchJestSnapshots,
    description: 'Update Jest snapshot URLs to the new documentation site',
  },
];
