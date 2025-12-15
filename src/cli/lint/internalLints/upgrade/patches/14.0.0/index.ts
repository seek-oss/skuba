import type { Patches } from '../../index.js';

import { addTypeModuleToPackageJson } from './addTypeModuleToPackageJson.js';
import { rewriteGlobalVars } from './rewriteGlobalVars.js';

export const patches: Patches = [
  {
    apply: addTypeModuleToPackageJson,
    description: 'Add module type to package.json to support ESM',
  },
  {
    apply: rewriteGlobalVars,
    description:
      'Replace __dirname and __filename with import.meta equivalents',
  },
];
