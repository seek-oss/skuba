import type { Patches } from '../../index.ts';

import { tryPatchApiTokenFromEnvironment } from './patchApiTokenFromEnvironment.ts';
import { tryPatchDockerfileSyntaxDirective } from './patchDockerfileSyntaxDirective.ts';

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
