import type { Patches } from '../../index.js';

import { tryCollapseDuplicateMergeKeys } from './collapseDuplicateMergeKeys.js';
import { tryMoveNpmrcMounts } from './moveNpmrcMounts.js';
import { tryPatchDockerComposeFiles } from './patchDockerCompose.js';
import { tryPatchDockerImages } from './patchDockerImages.js';
import { tryUpgradeESLint } from './upgradeESLint.js';

export const patches: Patches = [
  {
    apply: tryCollapseDuplicateMergeKeys,
    description: 'Collapse duplicate merge keys in .buildkite files',
  },
  {
    apply: tryUpgradeESLint,
    description: 'Upgrade to ESLint flat config',
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
