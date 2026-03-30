import type { Patches } from '../../index.js';

import { addTypeModuleToPackageJson } from './addTypeModuleToPackageJson.js';
import { migrateEslintConfigExportDefaultPatch } from './migrateEslintConfigExportDefault.js';
import { tryMigrateToVitest } from './migrateToVitest.js';
import { tryRemovePnpmPlugin } from './removePnpmPlugin.js';
import { rewriteGlobalVars } from './rewriteGlobalVars.js';

export const patches: Patches = [
  {
    apply: tryRemovePnpmPlugin,
    description: 'Remove pnpm-plugin-skuba',
  },
  {
    apply: addTypeModuleToPackageJson,
    description: 'Add module type to package.json to support ESM',
  },
  {
    apply: migrateEslintConfigExportDefaultPatch,
    description: 'Convert module.exports to export default (CommonJS to ESM)',
  },
  {
    apply: rewriteGlobalVars,
    description:
      'Replace __dirname and __filename with import.meta equivalents',
  },
  {
    apply: tryMigrateToVitest,
    description: 'Migrate to Vitest',
  },
];
