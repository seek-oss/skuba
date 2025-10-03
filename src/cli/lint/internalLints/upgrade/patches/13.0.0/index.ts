import type { Patches } from '../../index.js';

import { configureTsConfigForESM } from './configureTsConfigForESM.js';
import { rewriteSrcImports } from './rewriteSrcImports.js';

export const patches: Patches = [
  {
    apply: rewriteSrcImports,
    description: "Rewrite all 'src' imports to be '#src'",
  },
  {
    apply: configureTsConfigForESM,
    description:
      'Configure `tsconfig.json`, `package.json` and `jest.config.ts` for ESM',
  },
];
