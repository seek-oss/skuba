import type { Patches } from '../../index.ts';

import { configureTsConfigForESM } from './configureTsConfigForESM.ts';
import { patchApiDockerfiles } from './patchApiDockerfiles.ts';
import { rewriteSrcImports } from './rewriteSrcImports.ts';
import { updateLambdaConfigs } from './updateLambdaConfigs.ts';

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
  {
    apply: patchApiDockerfiles,
    description: 'Patch Dockerfiles to copy `package.json`',
  },
];
