import type { Patches } from '../..';

import { tryPatchDockerComposeFiles } from './patchDockerCompose';

export const patches: Patches = [
  {
    apply: tryPatchDockerComposeFiles,
    description: 'Remove version field from docker-compose files',
  },
];
