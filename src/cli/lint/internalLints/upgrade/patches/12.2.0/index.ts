import type { Patches } from '../../index.js';

import { rewriteSrcImports } from './rewriteSrcImports.js';

export const patches: Patches = [
  {
    apply: rewriteSrcImports,
    description: "Rewrite all 'src' imports to be '#src'",
  },
];
