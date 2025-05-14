import type { Patches } from '../..';
import { tryPatchRenovateConfig } from '../../../patchRenovateConfig';

import { tryAddEmptyExports } from './addEmptyExports';
import { tryPatchDockerfile } from './patchDockerfile';
import { tryPatchServerListener } from './patchServerListener';

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
];
