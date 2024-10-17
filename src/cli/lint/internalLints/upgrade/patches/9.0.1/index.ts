import type { Patches } from '../..';

import { tryPatchPnpmDockerImages } from './patchPnpmDockerImages';

export const patches: Patches = [
  {
    apply: tryPatchPnpmDockerImages,
    description: 'Pin pnpm version in Dockerfiles',
  },
];
