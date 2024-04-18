import type { Module, Options } from '../types';

import { eslintModule } from './eslint';
import { ignoreModule } from './ignore';
import { jestModule } from './jest';
import { nodemonModule } from './nodemon';
import { packageModule } from './package';
import { prettierModule } from './prettier';
import { renovateModule } from './renovate';
import { serverlessModule } from './serverless';
import { skubaDiveModule } from './skubaDive';
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
      serverlessModule,
      skubaDiveModule,
      tslintModule,
    ].map((createModule) => createModule(opts)),
  );
