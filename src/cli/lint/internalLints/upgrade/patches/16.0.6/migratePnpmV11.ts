import { inspect } from 'util';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const migratePnpmV11: PatchFunction = async ({
  mode,
  packageManager,
}): Promise<PatchReturnType> => {
  if (packageManager.command !== 'pnpm') {
    return {
      result: 'skip',
      reason: 'not a pnpm project',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await exec('pnpx', 'codemod', 'run', 'pnpm-v10-to-v11', '--no-interactive');

  await patchPnpmWorkspace(mode);

  return {
    result: 'apply',
  };
};

export const tryMigratePnpmV11: PatchFunction = async (args) => {
  try {
    return await migratePnpmV11(args);
  } catch (err) {
    log.warn('Failed to run pnpm-v10-to-v11 codemod');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
