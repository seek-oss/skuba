import { inspect } from 'util';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';
import { nodeVersionMigration } from '../../../../../migrate/nodeVersion';

const upgradeNode: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  if (mode === 'lint' || process.env.SKIP_NODE_UPGRADE) {
    return {
      result: 'skip',
    };
  }

  await nodeVersionMigration({ nodeVersion: 22, ECMAScriptVersion: 'ES2024' });

  return { result: 'apply' };
};

export const tryUpgradeNode: PatchFunction = async (config) => {
  try {
    return await upgradeNode(config);
  } catch (err) {
    log.warn('Failed to patch Docker images');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
