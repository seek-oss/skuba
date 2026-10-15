import type { Patches } from '../../index.ts';

import { tryPatchDockerfileCIVariable } from './patchDockerfileCIVariable.ts';

export const patches: Patches = [
  {
    apply: tryPatchDockerfileCIVariable,
    description: 'Remove Dockerfile syntax directives',
  },
];
