import type { Module, Options } from '../types.js';

import { eslintModule } from './eslint.js';
import { ignoreModule } from './ignore.js';
import { packageModule } from './package.js';
import { prettierModule } from './prettier.js';
import { renovateModule } from './renovate.js';

export const loadModules = (opts: Options): Promise<Module[]> =>
  Promise.all(
    [
      eslintModule,
      ignoreModule,
      packageModule,
      prettierModule,
      renovateModule,
    ].map(async (createModule) => createModule(opts)),
  );
