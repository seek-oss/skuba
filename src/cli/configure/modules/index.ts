import { Module, Options } from '../types';

import { eslintModule } from './eslint';
import { ignoreModule } from './ignore';
import { jestModule } from './jest';
import { nodemonModule } from './nodemon';
import { packageModule } from './package';
import { prettierModule } from './prettier';
import { renovateModule } from './renovate';
import { skubaDiveModule } from './skubaDive';
import { tsconfigModule } from './tsconfig';
import { tslintModule } from './tslint';

export const loadModules = (opts: Options): Promise<Module[]> =>
  Promise.all(
    [
      eslintModule,
      ignoreModule,
      jestModule,
      nodemonModule,
      packageModule,
      prettierModule,
      renovateModule,
      skubaDiveModule,
      tsconfigModule,
      tslintModule,
    ].map((createModule) => createModule(opts)),
  );
