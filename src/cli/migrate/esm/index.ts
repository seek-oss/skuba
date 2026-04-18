import type { PatchReturnType } from '../../lint/internalLints/upgrade/index.js';

import { migrateToVitest } from './vitest/vitest.js';

export const migrateToESM = async ({
  mode,
}: {
  mode: 'lint' | 'format';
}): Promise<PatchReturnType> => {
  const vitestMigrationResult = await migrateToVitest({ mode });

  return vitestMigrationResult;
};
