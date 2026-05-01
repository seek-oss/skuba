import { inspect } from 'util';

import { log } from '../../../utils/logging.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';
import { upgradeInfraPackages } from '../nodeVersion/upgrade.js';

const upgradeSkubaDive: PatchFunction = async (opts) =>
  upgradeInfraPackages(opts.mode, [
    {
      name: 'skuba-dive',
      version: '4.1.0',
    },
  ]);

export const tryUpgradeSkubaDive: PatchFunction = async (opts) => {
  try {
    return await upgradeSkubaDive(opts);
  } catch (err) {
    // Don't fail the entire lint/format if this fails since it's a non-critical part of the upgrade
    // and can be retried later by the user
    log.warn('Failed to upgrade skuba-dive dependencies, skipping');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
