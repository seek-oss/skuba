import type { Patches } from '../../index.js';

import { tryAddSeekPackageRegistry } from './addSeekPackageRegistry.js';

export const patches: Patches = [
  {
    apply: tryAddSeekPackageRegistry,
    description: 'Add SEEK registry to .npmrc files for SEEK-Jobs repositories',
  },
];
