import type { Patches } from '../../index.js';

import { tryPatchDockerfileSyntaxDirective } from './patchDockerfileSyntaxDirective.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfileSyntaxDirective,
    description: 'Remove Dockerfile syntax directives',
  },
];
