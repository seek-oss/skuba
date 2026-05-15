import { tryPatchRenovateConfig } from '../../../patchRenovateConfig.js';
import type { Patches } from '../../index.js';

import { tryPatchDockerfile } from './patchDockerfile.js';
import { tryPatchServerListener } from './patchServerListener.js';

export const patches: Patches = [
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
