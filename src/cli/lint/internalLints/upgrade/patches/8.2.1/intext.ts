import type { Patches } from '../..';

import { tryPatchDockerComposeFiles } from './patchDockerCompose';

export const patches: Patches = [
  {
    apply: tryPatchDockerComposeFiles,
    description:
      'Add empty exports to Jest files for compliance with TypeScript isolated modules',
  },
];
