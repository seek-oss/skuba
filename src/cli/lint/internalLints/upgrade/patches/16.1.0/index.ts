import type { Patches } from '../../index.js';

import { tryAddDdTraceEsmImport } from './addDdTraceEsmImport.js';
import { patchDockerfiles } from './addMultistageBuilds.js';

export const patches: Patches = [
  {
    apply: tryAddDdTraceEsmImport,
    description:
      'Add dd-trace ESM --import to NODE_OPTIONS for Datadog lambdas with handler redirection disabled',
  },
  {
    apply: patchDockerfiles,
    description: 'Add multi stage builds to api Dockerfiles',
  },
];
