import type { Patches } from '../../index.js';

import { addTsConfigImportExtensions } from './addTsConfigImportExtensions.js';
import { rewriteRelativePathExtensions } from './rewriteRelativePathExtensions.js';
import {
  addPackageJsonJsonImports,
  updatePackageJsonImports,
} from './updatePackageJsonImports.js';

export const patches: Patches = [
  {
    apply: addTsConfigImportExtensions,
    description:
      'Add `allowImportingTsExtensions` and `rewriteRelativeImportExtensions` to tsconfig.json',
  },
  {
    apply: rewriteRelativePathExtensions,
    description:
      'Rewrite relative .js imports to .ts and #src imports without extensions',
  },
  {
    apply: updatePackageJsonImports,
    description:
      'Update package.json #src subpath imports for TypeScript source extensions',
  },
  {
    apply: addPackageJsonJsonImports,
    description:
      'Add package.json #src/*.json subpath imports for JSON module resolution',
  },
];
