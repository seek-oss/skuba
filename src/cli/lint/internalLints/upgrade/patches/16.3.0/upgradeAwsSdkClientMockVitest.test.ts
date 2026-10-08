import { beforeEach, describe, expect, it, vi } from 'vitest';

import { upgradeInfraPackages } from '../../../../../migrate/nodeVersion/upgrade.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryUpgradeAwsSdkClientMockVitest } from './upgradeAwsSdkClientMockVitest.js';

vi.mock('../../../../../migrate/nodeVersion/upgrade.js', () => ({
  upgradeInfraPackages: vi.fn(),
}));

vi.spyOn(console, 'log').mockImplementation(() => undefined);

const baseArgs: PatchConfig = {
  manifest: {
    packageJson: {
      name: 'test',
      version: '1.0.0',
      readme: 'README.md',
      _id: 'test',
    },
    path: 'package.json',
  },
  mode: 'format',
};

describe('tryUpgradeAwsSdkClientMockVitest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upgrade aws-sdk-client-mock-vitest to 8.0.0', async () => {
    vi.mocked(upgradeInfraPackages).mockResolvedValue({ result: 'apply' });

    await expect(tryUpgradeAwsSdkClientMockVitest(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(upgradeInfraPackages).toHaveBeenCalledWith('format', [
      {
        name: 'aws-sdk-client-mock-vitest',
        version: '8.0.0',
      },
    ]);
  });

  it('should pass lint mode through to upgradeInfraPackages', async () => {
    vi.mocked(upgradeInfraPackages).mockResolvedValue({ result: 'apply' });

    await expect(
      tryUpgradeAwsSdkClientMockVitest({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(upgradeInfraPackages).toHaveBeenCalledWith('lint', [
      {
        name: 'aws-sdk-client-mock-vitest',
        version: '8.0.0',
      },
    ]);
  });

  it('should skip if upgradeInfraPackages throws', async () => {
    vi.mocked(upgradeInfraPackages).mockRejectedValue(new Error('boom'));

    await expect(tryUpgradeAwsSdkClientMockVitest(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'due to an error',
    } satisfies PatchReturnType);
  });
});
