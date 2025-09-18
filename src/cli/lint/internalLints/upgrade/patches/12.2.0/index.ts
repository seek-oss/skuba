import type { Patches } from '../../index.js';

import { tryPatchPnpmWorkspace } from './patchPnpmWorkspace.js';

export const patches: Patches = [
  {
    apply: tryPatchPnpmWorkspace,
    description:
      'Update `pnpm-workspace.yaml` to include `minimumReleaseAge` field',
  },
];
