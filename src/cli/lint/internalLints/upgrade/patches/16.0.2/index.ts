import type { Patches } from '../../index.js';

import { tryPatchTsdownUnbundle } from './patchTsdownUnbundle.js';

export const patches: Patches = [
  {
    apply: tryPatchTsdownUnbundle,
    description:
      'Unbundle tsdown.config files to avoid shipping translations and CSS in packages that use tsdown for non-translation purposes',
  },
];
