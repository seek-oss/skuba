import type { PackageManagerConfig } from '../../../utils/packageManager.js';
import type { PatchReturnType } from '../../lint/internalLints/upgrade/index.js';

import { migrateToVitest } from './vitest/vitest.js';

export const migrateToESM = async ({
  mode,
  packageManager,
}: {
  mode: 'lint' | 'format';
  packageManager?: PackageManagerConfig;
}): Promise<PatchReturnType> => {
  const vitestMigrationResult = await migrateToVitest({ mode, packageManager });

  return vitestMigrationResult;
};
