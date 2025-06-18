import { inspect } from 'util';

import { log } from '../../../../../../utils/logging.js';
import { nodeVersionMigration } from '../../../../../migrate/nodeVersion/index.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const upgradeNode: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  if (process.env.SKIP_NODE_UPGRADE) {
    return {
      result: 'skip',
      reason: 'SKIP_NODE_UPGRADE environment variable set',
    };
  }
  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await nodeVersionMigration({
    nodeVersion: 22,
    ECMAScriptVersion: 'ES2024',
  });

  return { result: 'apply' };
};

export const tryUpgradeNode: PatchFunction = async (config) => {
  try {
    return await upgradeNode(config);
  } catch (err) {
    log.warn('Failed to upgrade node version');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
