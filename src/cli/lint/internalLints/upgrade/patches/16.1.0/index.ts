import type { Patches } from '../../index.js';

import { patchDockerfiles } from './addMultistageBuilds.js';

export const patches: Patches = [
  {
    apply: patchDockerfiles,
    description: 'Add multi stage builds to api Dockerfiles',
  },
];
