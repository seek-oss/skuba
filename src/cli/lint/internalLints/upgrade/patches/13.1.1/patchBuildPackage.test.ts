import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import * as checks from '../../../../../migrate/nodeVersion/checks.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchBuildPackage } from './patchBuildPackage.js';

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: string | string[], opts: { ignore: string[] }) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

jest
  .spyOn(checks, 'isLikelyPackage')
  .mockImplementation(() => Promise.resolve(true));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
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
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

describe('patchBuildPackage', () => {
  it('should skip if no package.json files found', async () => {
    vol.fromJSON({});

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'unable to find package.json files',
    });
  });

  it('should skip if no skuba build-package command found', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          version: '1.0.0',
          skuba: { type: 'package' },
          scripts: {
            build: 'tsc',
            test: 'jest',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no skuba build-package command found',
    });
  });

  it('should return apply in lint mode when skuba build-package is found', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          version: '1.0.0',
          skuba: { type: 'package' },
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });
  });

  it('should replace skuba build-package with tsdown in format mode', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          version: '1.0.0',
          skuba: { type: 'package' },
          scripts: {
            build: 'skuba build-package',
            test: 'jest',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    const packageJson = JSON.parse(result['package.json']!);
    expect(packageJson.scripts.build).toBe('tsdown');
    expect(packageJson.scripts.test).toBe('jest');
  });

  it('should handle package.json with skuba build-package in multiple scripts', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          version: '1.0.0',
          skuba: { type: 'package' },
          scripts: {
            build: 'skuba build-package',
            'build:watch': 'skuba build-package --watch',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    const packageJson = JSON.parse(result['package.json']!);

    expect(packageJson.scripts.build).toBe('tsdown');
  });

  it('should handle monorepo with multiple package.json files', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'root',
          version: '1.0.0',
          private: true,
          scripts: {
            build: 'yarn workspaces run build',
          },
        },
        null,
        2,
      ),
      'packages/package-a/package.json': JSON.stringify(
        {
          name: 'package-a',
          version: '1.0.0',
          skuba: { type: 'package' },
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
      'packages/package-b/package.json': JSON.stringify(
        {
          name: 'package-b',
          version: '1.0.0',
          types: 'index.d.ts',
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    const packageA = JSON.parse(result['packages/package-a/package.json']!);
    const packageB = JSON.parse(result['packages/package-b/package.json']!);

    expect(packageA.scripts.build).toBe('tsdown');
    expect(packageB.scripts.build).toBe('tsdown');
  });

  it('should preserve other package.json fields and formatting', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          version: '1.0.0',
          description: 'A test package',
          skuba: { type: 'package' },
          scripts: {
            build: 'skuba build-package',
            test: 'jest',
            lint: 'eslint',
          },
          dependencies: {
            react: '^18.0.0',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    const packageJson = JSON.parse(result['package.json']!);

    expect(packageJson.name).toBe('test');
    expect(packageJson.description).toBe('A test package');
    expect(packageJson.scripts.build).toBe('tsdown');
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.scripts.lint).toBe('eslint');
    expect(packageJson.dependencies).toEqual({ react: '^18.0.0' });
    expect(packageJson.devDependencies).toEqual({ jest: '^29.0.0' });
  });

  it('should only process likely packages', async () => {
    jest
      .spyOn(checks, 'isLikelyPackage')
      .mockImplementation((path) => Promise.resolve(path === 'package.json'));

    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          skuba: { type: 'package' },
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
      'packages/not-a-package/package.json': JSON.stringify(
        {
          name: 'not-a-package',
          private: true,
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchBuildPackage({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    const rootPackage = JSON.parse(result['package.json']!);
    const notPackage = JSON.parse(
      result['packages/not-a-package/package.json']!,
    );

    expect(rootPackage.scripts.build).toBe('tsdown');

    expect(notPackage.scripts.build).toBe('skuba build-package');
  });
});
