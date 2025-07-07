import type { Patches } from '../..';

import { rewriteSrcImports } from './rewriteSrcImports';

export const patches: Patches = [
  {
    apply: rewriteSrcImports,
    description: "Rewrite all 'src' imports to be '#src'",
  },
];
