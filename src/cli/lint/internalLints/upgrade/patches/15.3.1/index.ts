import type { Patches } from '../../index.js';

import { tryPatchDockerfilePruneProd } from './patchDockerfilePruneProd.js';
import { tryPatchTsdownUnbundle } from './patchTsdownUnbundle.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfilePruneProd,
    description:
      'Replace pnpm install --prod with pnpm prune --prod in Dockerfiles',
  },
  {
    apply: tryPatchTsdownUnbundle,
    description:
      'Unbundle tsdown.config files to avoid shipping translations and CSS in packages that use tsdown for non-translation purposes',
  },
];
