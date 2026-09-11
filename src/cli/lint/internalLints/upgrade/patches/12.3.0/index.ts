import type { Patches } from '../../index.js';

import { tryPatchApiTokenFromEnvironment } from './patchApiTokenFromEnvironment.js';
import { tryPatchDockerfileSyntaxDirective } from './patchDockerfileSyntaxDirective.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfileSyntaxDirective,
    description: 'Remove Dockerfile syntax directives',
  },
  {
    apply: tryPatchApiTokenFromEnvironment,
    description: 'Update import for `apiTokenFromEnvironment`',
  },
];
