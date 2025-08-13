import type { Patches } from '../../index.js';

import { tryPatchUnhandledRejections } from './unhandledRejections.js';

export const patches: Patches = [
  {
    apply: tryPatchUnhandledRejections,
    description:
      'Add event handler to log unhandled promise rejections instead of crashing the process',
  },
];
