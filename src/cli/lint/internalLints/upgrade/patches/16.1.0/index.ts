import type { Patches } from '../../index.js';

import { pruneDevDeps } from './pruneDevDeps.js';

export const patches: Patches = [
  {
    apply: pruneDevDeps,
    description: 'Add multi stage builds to api Dockerfiles',
  },
];
