import type { Patches } from '../..';

import { tryCollapseDuplicateMergeKeys } from './collapseDuplicateMergeKeys';
import { tryMoveNpmrcMounts } from './moveNpmrcMounts';
import { tryPatchDockerComposeFiles } from './patchDockerCompose';
import { tryPatchDockerImages } from './patchDockerImages';
import { tryUpgradeESLint } from './upgradeESLint';

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
