import { inspect } from 'util';

import { glob } from 'fast-glob';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPackageManager } from '../../../../../../utils/packageManager.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const migrateToVitest: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const vitestConfigFiles = await glob(['**/vitest.config.{ts,js,mts,cts}'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (vitestConfigFiles.length > 0) {
    return {
      result: 'skip',
      reason: 'vitest is already configured in this project',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  const packageManager = await detectPackageManager();

  if (packageManager.command === 'pnpm') {
    // Hoist our new pnpm packages
    await patchPnpmWorkspace('format');
    await exec('pnpm install --offline');

    await exec('pnpm dlx @sku-lib/codemod jest-to-vitest .');
  } else {
    await exec('npx @sku-lib/codemod jest-to-vitest .');
  }

  return {
    result: 'apply',
  };
};

export const tryMigrateToVitest: PatchFunction = async (config) => {
  try {
    return await migrateToVitest(config);
  } catch (err) {
    log.warn('Failed to migrate to Vitest');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
