import type { Patches } from '../../index.js';

import { tryAddDdTraceEsmImport } from './addDdTraceEsmImport.js';
import { tryPatchTsconfig } from './patchTsconfig.js';
import { pruneDevDeps } from './pruneDevDeps.js';

export const patches: Patches = [
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
];
