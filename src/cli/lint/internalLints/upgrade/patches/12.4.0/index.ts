import type { Patches } from '../../index.js';

import { tryPatchDockerfileCIVariable } from './patchDockerfileCIVariable.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfileCIVariable,
    description: 'Remove Dockerfile syntax directives',
  },
];
