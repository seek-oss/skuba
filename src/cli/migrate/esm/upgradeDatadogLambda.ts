import { inspect } from 'util';

import { findLatestAllowedVersion } from '../../../utils/findLatestAllowedVersion.js';
import { log } from '../../../utils/logging.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';
import { upgradeInfraPackages } from '../nodeVersion/upgrade.js';

const upgradeDatadogLambda: PatchFunction = async (opts) => {
  const version = await findLatestAllowedVersion(
    'datadog-lambda-js',
    '^12.140.0',
  );
  if (!version) {
    log.warn(
      'No eligible version of datadog-lambda-js found for upgrade, skipping',
    );
    return { result: 'skip', reason: 'no eligible version found' };
  }

  return upgradeInfraPackages(opts.mode, [
    {
      name: 'datadog-lambda-js',
      version,
    },
  ]);
};

export const tryUpgradeDatadogLambda: PatchFunction = async (opts) => {
  try {
    return await upgradeDatadogLambda(opts);
  } catch (err) {
    // Don't fail the entire lint/format if this fails since it's a non-critical part of the upgrade
    // and can be retried later by the user
    log.warn('Failed to upgrade datadog-lambda-js dependencies, skipping');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
