import type { Patches } from '../../index.js';

import { tryPatchPnpmDockerImages } from './patchPnpmDockerImages.js';

export const patches: Patches = [
  {
    apply: tryPatchPnpmDockerImages,
    description: 'Use pinned pnpm version in Dockerfiles',
  },
];
