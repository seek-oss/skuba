import type { Patches } from '../../index.js';

import { configureTsConfigForESM } from './configureTsConfigForESM.js';

export const patches: Patches = [
  {
    apply: configureTsConfigForESM,
    description: 'Configure `tsconfig.json` and `package.json` for ESM',
  },
];
