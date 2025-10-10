import type { Patches } from '../../index.js';

import { configureTsConfigForESM } from './configureTsConfigForESM.js';
import { rewriteSrcImports } from './rewriteSrcImports.js';
import { updateLambdaConfigs } from './updateLambdaConfigs.js';

export const patches: Patches = [
  {
    apply: rewriteSrcImports,
    description: "Rewrite all 'src' imports to be '#src'",
  },
  {
    apply: configureTsConfigForESM,
    description:
      'Configure `tsconfig.json`, `package.json` and `jest.config.ts` to support custom conditions',
  },
  {
    apply: updateLambdaConfigs,
    description:
      'Update lambda function configurations to support custom conditions',
  },
];
