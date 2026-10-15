import { beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../testing/memfs.ts';
import { findLatestAllowedVersion } from '../../../utils/findLatestAllowedVersion.ts';
import { configForPackageManager } from '../../../utils/packageManager.ts';
import type {
  PatchConfig,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.ts';

import { tryUpgradeDatadogLambda } from './upgradeDatadogLambda.ts';

vi.mock('fs-extra', () => ({
  default: memfs,
  ...memfs,
}));
vi.mock('../../../utils/findLatestAllowedVersion.ts');
vi.mock('../../../utils/exec.ts');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
  vi.mocked(findLatestAllowedVersion).mockResolvedValue('12.140.0');
});

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
  packageManager: configForPackageManager('pnpm'),
  mode: 'format',
};

describe('upgradeDatadogLambda', () => {
  it('upgrades datadog-lambda-js to the fixed release', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: { 'datadog-lambda-js': '^12.100.0' },
        }),
      },
      process.cwd(),
    );

    await expect(tryUpgradeDatadogLambda(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{"dependencies":{"datadog-lambda-js":"^12.140.0"}}",
      }
    `);
  });

  it('skips when datadog-lambda-js is not a dependency', async () => {
    const input = {
      'package.json': JSON.stringify({ dependencies: { pino: '^9.0.0' } }),
    };
    vol.fromJSON(input, process.cwd());

    await expect(tryUpgradeDatadogLambda(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no package.json or pnpm-workspace.yaml files to patch',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });
});
