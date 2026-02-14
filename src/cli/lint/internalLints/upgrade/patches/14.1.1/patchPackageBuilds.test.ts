import memfs, { vol } from 'memfs';

import * as execModule from '../../../../../../utils/exec.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import * as checks from '../../../../../migrate/nodeVersion/checks.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchPackageBuilds } from './patchPackageBuilds.js';

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: string | string[], opts: { ignore: string[] }) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

jest
  .spyOn(checks, 'isLikelyPackage')
  .mockImplementation(() => Promise.resolve(true));

const exec = jest.spyOn(execModule, 'exec');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
  exec.mockResolvedValue(undefined as any);
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

describe('patchPackageBuilds', () => {
  it('should skip if no package.json files found', async () => {
    vol.fromJSON({});

    await expect(
      patchPackageBuilds({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'unable to find package.json files',
    });
  });

  it('should skip if tsdown.config already exists', async () => {
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
      'tsdown.config.ts': 'export default {};',
    });

    await expect(
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no skuba build-package command found',
    });

    expect(exec).not.toHaveBeenCalled();
  });

  it('should return apply in lint mode when package.json is found', async () => {
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
      patchPackageBuilds({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['tsdown.config.ts']).toBeUndefined();
  });

  it('should create tsdown.config.ts with default config in format mode', async () => {
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
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['tsdown.config.ts']).toBeDefined();
    expect(result['tsdown.config.ts']).toContain("entry: ['src/index.ts']");
    expect(result['tsdown.config.ts']).toContain("format: ['cjs', 'esm']");
    expect(result['tsdown.config.ts']).toContain("outDir: 'lib'");
    expect(result['tsdown.config.ts']).toContain('dts: true');
    expect(exec).toHaveBeenCalledWith('pnpm', 'tsdown');
  });

  it('should extract and include assets in tsdown.config.ts', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          version: '1.0.0',
          skuba: {
            type: 'package',
            assets: ['src/**/*.graphql', 'src/**/*.json'],
          },
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['tsdown.config.ts']).toBeDefined();
    expect(result['tsdown.config.ts']).toContain("entry: ['src/index.ts']");
    expect(result['tsdown.config.ts']).toContain("format: ['cjs', 'esm']");
    expect(result['tsdown.config.ts']).toContain("outDir: 'lib'");
    expect(result['tsdown.config.ts']).toContain('dts: true');
    expect(result['tsdown.config.ts']).toContain(
      'copy: ["src/**/*.graphql","src/**/*.json"]',
    );
  });

  it('should create tsdown.config.ts without copy when no assets are present', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'test',
          version: '1.0.0',
          skuba: {
            type: 'package',
          },
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['tsdown.config.ts']).toBeDefined();
    expect(result['tsdown.config.ts']).not.toContain('copy:');
  });

  it('should extract assets from monorepo packages', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'root',
          version: '1.0.0',
          private: true,
        },
        null,
        2,
      ),
      'packages/package-a/package.json': JSON.stringify(
        {
          name: 'package-a',
          version: '1.0.0',
          skuba: {
            type: 'package',
            assets: ['src/**/*.txt'],
          },
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
          skuba: {
            type: 'package',
            assets: ['src/**/*.yml', 'src/**/*.yaml'],
          },
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
    });

    await expect(
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['packages/package-a/tsdown.config.ts']).toBeDefined();
    expect(result['packages/package-a/tsdown.config.ts']).toContain(
      'copy: ["src/**/*.txt"]',
    );
    expect(result['packages/package-b/tsdown.config.ts']).toBeDefined();
    expect(result['packages/package-b/tsdown.config.ts']).toContain(
      'copy: ["src/**/*.yml","src/**/*.yaml"]',
    );
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
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['tsdown.config.ts']).toBeDefined();
    expect(result['packages/package-a/tsdown.config.ts']).toBeDefined();
    expect(result['packages/package-b/tsdown.config.ts']).toBeDefined();
    expect(exec).toHaveBeenCalledWith('pnpm', 'tsdown');
  });

  it('should remove the assests field from the original package.json file', async () => {
    const originalPackageJson = {
      name: 'test',
      version: '1.0.0',
      description: 'A test package',
      skuba: {
        type: 'package',
        assets: ['src/**/*.txt'],
        template: 'koa-rest-api',
      },
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
    };

    const newPackageJson = {
      name: 'test',
      version: '1.0.0',
      description: 'A test package',
      skuba: { type: 'package', template: 'koa-rest-api' },
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
    };

    vol.fromJSON({
      'package.json': JSON.stringify(originalPackageJson, null, 2),
    });

    await expect(
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    const packageJson = JSON.parse(result['package.json']!);

    expect(packageJson).toEqual(newPackageJson);
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
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['tsdown.config.ts']).toBeDefined();
    expect(result['packages/not-a-package/tsdown.config.ts']).toBeUndefined();
  });

  it('should skip packages that already have tsdown config variants', async () => {
    jest
      .spyOn(checks, 'isLikelyPackage')
      .mockImplementation((path) => Promise.resolve(path !== 'package.json'));

    vol.fromJSON({
      'package.json': JSON.stringify(
        {
          name: 'root',
          version: '1.0.0',
          private: true,
        },
        null,
        2,
      ),
      'packages/package-a/package.json': JSON.stringify(
        {
          name: 'package-a',
          version: '1.0.0',
          skuba: { type: 'package' },
        },
        null,
        2,
      ),
      'packages/package-a/tsdown.config.js': 'module.exports = {};',
      'packages/package-b/package.json': JSON.stringify(
        {
          name: 'package-b',
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
      patchPackageBuilds({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    const result = volToJson();
    expect(result['tsdown.config.ts']).toBeUndefined();
    expect(result['packages/package-a/tsdown.config.ts']).toBeUndefined();
    expect(result['packages/package-b/tsdown.config.ts']).toBeDefined();
  });
});
