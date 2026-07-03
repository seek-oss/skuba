import latestVersion from 'latest-version';
import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../utils/packageManager.js';
import type {
  PatchConfig,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.js';

import { tryUpgradeDatadogLambda } from './upgradeDatadogLambda.js';

vi.mock('fs-extra', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));
vi.mock('latest-version');
vi.mock('../../../utils/exec.js');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
  vi.mocked(latestVersion).mockResolvedValue('12.140.0');
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
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: { 'datadog-lambda-js': '^12.100.0' },
      }),
    });

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
    vol.fromJSON(input);

    await expect(tryUpgradeDatadogLambda(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no package.json or pnpm-workspace.yaml files to patch',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });
});
