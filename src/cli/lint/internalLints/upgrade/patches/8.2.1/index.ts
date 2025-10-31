import type { Patches } from '../../index.js';

import { tryCollapseDuplicateMergeKeys } from './collapseDuplicateMergeKeys.js';
import { tryMoveNpmrcMounts } from './moveNpmrcMounts.js';
import { tryPatchDockerComposeFiles } from './patchDockerCompose.js';
import { tryPatchDockerImages } from './patchDockerImages.js';

export const patches: Patches = [
  {
    apply: tryCollapseDuplicateMergeKeys,
    description: 'Collapse duplicate merge keys in .buildkite files',
  },
  {
    apply: tryPatchDockerComposeFiles,
    description: 'Remove version field from docker-compose files',
  },
  {
    apply: tryPatchDockerImages,
    description:
      'Update docker image references to use public.ecr.aws and remove --platform flag',
  },
  {
    apply: tryMoveNpmrcMounts,
    description: 'Move .npmrc mounts from tmp/.npmrc to /tmp/.npmrc',
  },
];
