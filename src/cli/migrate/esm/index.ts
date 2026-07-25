import { log } from '../../../utils/logging.ts';
import { getConsumerManifest } from '../../../utils/manifest.ts';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../utils/packageManager.ts';
import type {
  Patch,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.ts';

import { addEslintConfigImportXNoDefaultExport } from './addEslintConfigImportXNoDefaultExport.ts';
import { tryAddFileExtensions } from './addFileExtensions.ts';
import { addTypeModuleToPackageJson } from './addTypeModuleToPackageJson.ts';
import { tryMigrateDockerfileRequires } from './migrateDockerfileRequires.ts';
import { migrateExportEqualsToDefaultPatch } from './migrateExportEqualsToDefault.ts';
import { migrateImportExportStatementsPatch } from './migrateImportExportStatements.ts';
import { tryMigrateLambdas } from './migrateLambdas.ts';
import { tryMigrateVocab } from './migrateVocab.ts';
import { tryPatchInstrumentation } from './patchInstrumentation.ts';
import { rewriteGlobalVars } from './rewriteGlobalVars.ts';
import { tryUpgradeSkubaDive } from './upgradeSkubaDive.ts';
import { migrateToVitest } from './vitest/vitest.ts';

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
    apply: migrateImportExportStatementsPatch,
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
    apply: tryMigrateDockerfileRequires,
    description: 'Migrate Dockerfiles to replace --require with --import',
  },
  {
    apply: tryPatchInstrumentation,
    description:
      'Patch Dockerfile CMD lines to add dd-trace or opentelemetry imports',
  },
  {
    apply: migrateToVitest,
    description: 'Migrate from Jest to Vitest',
  },
  {
    apply: tryAddFileExtensions,
    description: 'Add file extensions to imports',
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
