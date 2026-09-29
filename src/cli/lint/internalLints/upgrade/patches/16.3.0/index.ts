import type { Patches } from '../../index.js';

import { tryPatchAttwNode16 } from './patchAttwNode16.js';
import { tryPatchSeekLoggerCreateLogger } from './patchSeekLoggerCreateLogger.js';

export const patches: Patches = [
  {
    apply: tryPatchAttwNode16,
    description: 'Update tsdown attw: true to the node16 profile',
  },
  {
    apply: tryPatchSeekLoggerCreateLogger,
    description:
      'Migrate default createLogger imports from @seek/logger to named imports',
  },
];
