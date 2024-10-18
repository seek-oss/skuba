import type { Patches } from '../..';

import { tryPatchPnpmDockerImages } from './patchPnpmDockerImages';

export const patches: Patches = [
  {
    apply: tryPatchPnpmDockerImages,
    description: 'Use pinned pnpm version in Dockerfiles',
  },
];
