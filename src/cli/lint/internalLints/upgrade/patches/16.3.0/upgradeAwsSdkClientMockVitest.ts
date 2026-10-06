import { inspect } from 'util';

import { log } from '../../../../../../utils/logging.js';
import { upgradeInfraPackages } from '../../../../../migrate/nodeVersion/upgrade.js';
import type { PatchFunction } from '../../index.js';

const AWS_SDK_CLIENT_MOCK_VITEST_VERSION = '8.0.0';

const upgradeAwsSdkClientMockVitest: PatchFunction = async ({ mode }) =>
  upgradeInfraPackages(mode, [
    {
      name: 'aws-sdk-client-mock-vitest',
      version: AWS_SDK_CLIENT_MOCK_VITEST_VERSION,
    },
  ]);

export const tryUpgradeAwsSdkClientMockVitest: PatchFunction = async (
  config,
) => {
  try {
    return await upgradeAwsSdkClientMockVitest(config);
  } catch (err) {
    log.warn('Failed to upgrade aws-sdk-client-mock-vitest');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
