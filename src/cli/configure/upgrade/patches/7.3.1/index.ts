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
    description: 'Update renovate config for private Renovate auth',
  },
  {
    apply: tryPatchDockerfile,
    description: 'Swap node distroless Docker image to -debian11 variant',
  },
  {
    apply: tryPatchServerListener,
    description: 'Add keepAliveTimeout to server listener',
  },
];
