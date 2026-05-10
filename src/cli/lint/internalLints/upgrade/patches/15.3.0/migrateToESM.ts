import { inspect } from 'util';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { migrateToESM } from '../../../../../migrate/esm/index.js';
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
    try {
      await exec(
        'pnpm',
        'install',
        '--frozen-lockfile=false',
        '--prefer-offline',
      );
    } catch (error) {
      log.warn('Failed to install dependencies after patching pnpm workspace');
      log.subtle(inspect(error));
      // Don't fail the entire migration if this step fails, since the user can run pnpm install themselves after the migration
    }
  }

  return await migrateToESM(config);
};

export const tryMigrateToESM: PatchFunction = async (config) => {
  try {
    return await migrate(config);
  } catch (err) {
    log.warn('Failed to migrate to ESM');
    log.subtle(inspect(err));
    throw err;
  }
};
