import type { Patches } from '../../index.ts';

import { tryPatchUnhandledRejections } from './unhandledRejections.ts';

export const patches: Patches = [
  {
    apply: tryPatchUnhandledRejections,
    description:
      'Add event handler to log unhandled promise rejections instead of crashing the process',
  },
];
