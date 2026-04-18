import { inspect } from 'util';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { migrateToVitest } from '../../../../../migrate/esm/vitest/vitest.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchFunction } from '../../index.js';

const migrate: PatchFunction = async (config) => {
  const result = await patchPnpmWorkspace(config.mode);

  if (config.mode === 'lint' && !result.ok) {
    return {
      result: 'apply',
    };
  }

  if (config.mode !== 'lint' && config.packageManager.command === 'pnpm') {
    await exec('pnpm', 'install', '--prefer-offline');
  }

  return await migrateToVitest(config);
};

export const tryMigrateToVitest: PatchFunction = async (config) => {
  try {
    return await migrate(config);
  } catch (err) {
    log.warn('Failed to migrate to Vitest');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
