import type { Patches } from '../../index.ts';

import { tryPatchJestSnapshots } from './patchJestSnapshots.ts';

export const patches: Patches = [
  {
    apply: tryPatchJestSnapshots,
    description: 'Update Jest snapshot URLs to the new documentation site',
  },
];
