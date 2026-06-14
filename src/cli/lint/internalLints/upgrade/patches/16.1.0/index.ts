import type { Patches } from '../../index.js';

import { tryAddDdTraceEsmImport } from './addDdTraceEsmImport.js';
import { tryAddSeekPackageRegistry } from './addSeekPackageRegistry.js';
import { tryPatchTsconfig } from './patchTsconfig.js';
import { pruneDevDeps } from './pruneDevDeps.js';
import { tryRemoveVitestImports } from './removeVitestImports.js';

export const patches: Patches = [
  {
    apply: tryAddSeekPackageRegistry,
    description: 'Add SEEK registry to .npmrc files for SEEK-Jobs repositories',
  },
  {
    apply: tryAddDdTraceEsmImport,
    description:
      'Add dd-trace ESM --import to NODE_OPTIONS for Datadog lambdas with handler redirection disabled',
  },
  {
    apply: pruneDevDeps,
    description: 'Add multi stage builds to api Dockerfiles',
  },
  {
    apply: tryPatchTsconfig,
    description: 'Remove baseUrl from tsconfig.json',
  },
  {
    apply: tryRemoveVitestImports,
    description: 'Remove Vitest imports from test files',
  }
];
