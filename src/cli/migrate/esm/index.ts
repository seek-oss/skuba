import { log } from '../../../utils/logging.js';
import { getConsumerManifest } from '../../../utils/manifest.js';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../utils/packageManager.js';
import type {
  Patch,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.js';

import { addEslintConfigImportXNoDefaultExport } from './addEslintConfigImportXNoDefaultExport.js';
import { addTypeModuleToPackageJson } from './addTypeModuleToPackageJson.js';
import { migrateEslintConfigExportDefaultPatch } from './migrateEslintConfigExportDefault.js';
import { migrateExportEqualsToDefaultPatch } from './migrateExportEqualsToDefault.js';
import { tryMigrateLambdas } from './migrateLambdas.js';
import { tryMigrateVocab } from './migrateVocab.js';
import { rewriteGlobalVars } from './rewriteGlobalVars.js';
import { tryUpgradeSkubaDive } from './upgradeSkubaDive.js';
import { migrateToVitest } from './vitest/vitest.js';

const patches: Patch[] = [
  {
    apply: addTypeModuleToPackageJson,
    description: 'Add module type to package.json to support ESM',
  },
  {
    apply: tryMigrateVocab,
    description: 'Migrate vocab.config.js files to cjs',
  },
  {
    apply: migrateEslintConfigExportDefaultPatch,
    description: 'Convert module.exports to export default (CommonJS to ESM)',
  },
  {
    apply: addEslintConfigImportXNoDefaultExport,
    description:
      'Allow default exports in config files (import-x/no-default-export off)',
  },
  {
    apply: rewriteGlobalVars,
    description:
      'Replace __dirname and __filename with import.meta equivalents',
  },
  {
    apply: migrateExportEqualsToDefaultPatch,
    description: 'Replace TypeScript export = with export default',
  },
  {
    apply: tryUpgradeSkubaDive,
    description: 'Upgrade skuba-dive to support ESM',
  },
  {
    apply: tryMigrateLambdas,
    description: 'Migrate Lambdas to ESM',
  },
  {
    apply: migrateToVitest,
    description: 'Migrate from Jest to Vitest',
  },
];

export const migrateToESM = async (opts: {
  mode: 'lint' | 'format';
  packageManager?: PackageManagerConfig;
}): Promise<PatchReturnType> => {
  const { mode } = opts;

  const [manifest, packageManager] = await Promise.all([
    getConsumerManifest(),
    opts.packageManager ?? detectPackageManager(),
  ]);

  if (!manifest) {
    throw new Error('Could not find a package json for this project');
  }

  for (const patch of patches) {
    const result = await patch.apply({
      mode,
      manifest,
      packageManager,
    });

    if (mode === 'lint') {
      continue;
    }

    if (result.result === 'skip') {
      log.plain(
        `\nPatch skipped: ${patch.description}${
          result.reason ? ` - ${result.reason}` : ''
        }`,
      );
    } else {
      log.plain(`\nPatch applied: ${patch.description}`);
    }
  }

  return { result: 'apply' };
};
