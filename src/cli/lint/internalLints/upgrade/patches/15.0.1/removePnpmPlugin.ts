import { inspect } from 'util';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const removePnpmPlugin: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const result = await patchPnpmWorkspace(mode);

  if (mode === 'lint') {
    if (!result.ok) {
      return {
        result: 'apply',
      };
    }

    return {
      result: 'skip',
      reason: 'pnpm-workspace.yaml has already been migrated',
    };
  }

  await exec('pnpm', 'install', '--no-frozen-lockfile', '--prefer-offline');

  return {
    result: 'apply',
  };
};

export const tryRemovePnpmPlugin: PatchFunction = async (config) => {
  try {
    return await removePnpmPlugin(config);
  } catch (err) {
    log.warn('Failed to remove pnpm-plugin-skuba');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
