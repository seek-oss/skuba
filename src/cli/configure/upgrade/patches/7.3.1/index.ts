import type { Patches } from '../..';
import { tryPatchRenovateConfig } from '../../../patchRenovateConfig';

import { tryAddEmptyExports } from './addEmptyExports';
import { tryMoveNpmrcOutOfIgnoreManagedSection } from './moveNpmrcOutOfIgnoreManagedSection';
import { tryPatchDockerfile } from './patchDockerfile';
import { tryPatchServerListener } from './patchServerListener';
import { tryUpgradeToNode20 } from './upgradeToNode20';

export const patches: Patches = [
  {
    apply: tryAddEmptyExports,
    description:
      'Add empty exports to Jest files for compliance with TypeScript isolated modules',
  },
  {
    apply: tryPatchRenovateConfig,
    description: 'Update Renovate config to support private SEEK packages',
  },
  {
    apply: tryPatchDockerfile,
    description: 'Upgrade Node.js Distroless Docker image to -debian12 variant',
  },
  {
    apply: tryPatchServerListener,
    description: 'Add keepAliveTimeout to server listener',
  },
  {
    apply: tryUpgradeToNode20,
    description: 'Upgrade Node.js to 20',
  },
  {
    apply: tryMoveNpmrcOutOfIgnoreManagedSection('.gitignore'),
    description: 'Move .npmrc out of the .gitignore managed section',
  },
  {
    apply: tryMoveNpmrcOutOfIgnoreManagedSection('.dockerignore'),
    description: 'Move .npmrc out of the .dockerignore managed section',
  },
];
