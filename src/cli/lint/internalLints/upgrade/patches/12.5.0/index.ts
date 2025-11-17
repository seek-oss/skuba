import type { Patches } from '../../index.js';

import { rewriteGlobalVars } from './rewriteGlobalVars.js';

export const patches: Patches = [
  {
    apply: rewriteGlobalVars,
    description:
      'Replace __dirname and __filename with import.meta equivalents',
  },
];
