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

const exec = jest.spyOn(execModule, 'exec');
const createExec = jest.spyOn(execModule, 'createExec');

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
  exec.mockResolvedValue(undefined as any);
  createExec.mockImplementation(
    () => jest.fn().mockResolvedValue(undefined as any) as any,
  );
  jest.spyOn(checks, 'isLikelyPackage').mockResolvedValueOnce(true);
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
  const stdoutMock = jest.fn();

  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

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
      'tsdown.config.mts': 'export default {};',
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
    expect(result['tsdown.config.mts']).toBeUndefined();
  });

  it('should create tsdown.config.mts with default config in format mode', async () => {
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
    expect(result['tsdown.config.mts']).toBeDefined();
    expect(result['tsdown.config.mts']).toContain("entry: ['src/index.ts']");
    expect(result['tsdown.config.mts']).toContain("format: ['cjs', 'esm']");
    expect(result['tsdown.config.mts']).toContain("outDir: 'lib'");
    expect(result['tsdown.config.mts']).toContain('dts: true');

    expect(exec).toHaveBeenCalledWith('pnpm', 'install', '--offline');

    expect(createExec).toHaveBeenCalledWith({ cwd: expect.any(String) });

    const mockExecFn = createExec.mock.results[0]?.value;
    expect(mockExecFn).toHaveBeenCalledWith('pnpm', 'tsdown');
  });

  it('should extract and include assets in tsdown.config.mts', async () => {
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
    expect(result['tsdown.config.mts']).toBeDefined();
    expect(result['tsdown.config.mts']).toContain("entry: ['src/index.ts']");
    expect(result['tsdown.config.mts']).toContain("format: ['cjs', 'esm']");
    expect(result['tsdown.config.mts']).toContain("outDir: 'lib'");
    expect(result['tsdown.config.mts']).toContain('dts: true');
    expect(result['tsdown.config.mts']).toContain('exports: true');
    expect(result['tsdown.config.mts']).toContain(
      '      checks: {\n        legacyCjs: false,\n      },',
    );
    expect(result['tsdown.config.mts']).toContain(
      'copy: ["src/**/*.graphql","src/**/*.json"]',
    );
    const packageJson = JSON.parse(result['package.json']!);

    expect(packageJson).toMatchInlineSnapshot(`
      {
        "name": "test",
        "scripts": {
          "build": "skuba build-package",
        },
        "skuba": {
          "type": "package",
        },
        "version": "1.0.0",
      }
    `);
  });

  it('should create tsdown.config.mts without copy when no assets are present', async () => {
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
    expect(result['tsdown.config.mts']).toBeDefined();
    expect(result['tsdown.config.mts']).not.toContain('copy:');
  });

  it('should use custom condition from tsconfig.json in exports field', async () => {
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
      'tsconfig.json': JSON.stringify(
        {
          compilerOptions: {
            customConditions: ['seek-dev'],
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
    expect(result['tsdown.config.mts']).toBeDefined();
    expect(result['tsdown.config.mts']).toContain("entry: ['src/index.ts']");
    expect(result['tsdown.config.mts']).toContain("format: ['cjs', 'esm']");
    expect(result['tsdown.config.mts']).toContain("outDir: 'lib'");
    expect(result['tsdown.config.mts']).toContain('dts: true');
    expect(result['tsdown.config.mts']).toContain(
      "exports: { devExports: 'seek-dev' }",
    );
    expect(result['tsdown.config.mts']).not.toContain('exports: true');
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
    expect(result['packages/package-a/tsdown.config.mts']).toBeDefined();
    expect(result['packages/package-a/tsdown.config.mts']).toContain(
      'copy: ["src/**/*.txt"]',
    );
    expect(result['packages/package-b/tsdown.config.mts']).toBeDefined();
    expect(result['packages/package-b/tsdown.config.mts']).toContain(
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
    expect(result['tsdown.config.mts']).toBeDefined();
    expect(result['packages/package-a/tsdown.config.mts']).toBeDefined();
    expect(result['packages/package-b/tsdown.config.mts']).toBeDefined();
    expect(exec).toHaveBeenCalledTimes(3);
    expect(exec).toHaveBeenCalledWith('pnpm', 'install', '--offline');
    expect(createExec).toHaveBeenCalledTimes(3);
    createExec.mock.results.forEach((res) => {
      const mockExecFn = res.value;
      expect(mockExecFn).toHaveBeenCalledWith('pnpm', 'tsdown');
    });
  });

  it('should replace fields from the original package.json file', async () => {
    const originalPackageJson = {
      name: 'test',
      version: '1.0.0',
      description: 'A test package',
      main: './lib-commonjs/index.js',
      module: './lib-es2015/index.js',
      types: './lib-types/index.d.ts',
      files: [
        'lib*/**/*.d.ts',
        'lib*/**/*.js',
        'lib*/**/*.js.map',
        'lib*/**/*.json',
      ],
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
      main: './lib-commonjs/index.js',
      module: './lib-es2015/index.js',
      types: './lib-types/index.d.ts',
      files: ['lib'],
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
          version: '1.0.0',
          skuba: { type: 'application' },
          scripts: {
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
    expect(result['tsdown.config.mts']).toBeDefined();
    expect(result['packages/not-a-package/tsdown.config.mts']).toBeUndefined();
  });

  it('should update package.json fields in monorepo packages', async () => {
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
          main: './lib-commonjs/index.js',
          module: './lib-es2015/index.js',
          types: './lib-types/index.d.ts',
          files: ['lib*/**/*.js'],
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
          main: './lib-commonjs/index.js',
          module: './lib-es2015/index.js',
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
    const packageAJson = JSON.parse(result['packages/package-a/package.json']!);
    const packageBJson = JSON.parse(result['packages/package-b/package.json']!);

    expect(packageAJson).toMatchInlineSnapshot(`
      {
        "files": [
          "lib",
        ],
        "main": "./lib-commonjs/index.js",
        "module": "./lib-es2015/index.js",
        "name": "package-a",
        "scripts": {
          "build": "skuba build-package",
        },
        "skuba": {
          "type": "package",
        },
        "types": "./lib-types/index.d.ts",
        "version": "1.0.0",
      }
    `);

    expect(packageBJson).toMatchInlineSnapshot(`
      {
        "main": "./lib-commonjs/index.js",
        "module": "./lib-es2015/index.js",
        "name": "package-b",
        "scripts": {
          "build": "skuba build-package",
        },
        "skuba": {
          "type": "package",
        },
        "version": "1.0.0",
      }
    `);
  });
});
describe('patchPackageBuilds - skipLibCheck', () => {
  it('should add skipLibCheck to tsconfig.json when compilerOptions does not exist', async () => {
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
      'tsconfig.json': JSON.stringify({}, null, 2),
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
    const tsconfigContent = result['tsconfig.json']!;
    expect(tsconfigContent).toContain('"compilerOptions"');
    expect(tsconfigContent).toContain('"skipLibCheck": true');
  });

  it('should add skipLibCheck to tsconfig.json when compilerOptions exists but skipLibCheck does not', async () => {
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
      'tsconfig.json': JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
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
    const tsconfigContent = result['tsconfig.json']!;
    expect(tsconfigContent).toContain('"skipLibCheck": true');
    expect(tsconfigContent).toContain('"target": "ES2020"');
    expect(tsconfigContent).toContain('"module": "commonjs"');
  });

  it('should not modify tsconfig.json when skipLibCheck already exists', async () => {
    const originalTsconfig = {
      compilerOptions: {
        target: 'ES2020',
        skipLibCheck: false,
        module: 'commonjs',
      },
    };

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
      'tsconfig.json': JSON.stringify(originalTsconfig, null, 2),
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
    const tsconfig = JSON.parse(result['tsconfig.json']!);
    expect(tsconfig.compilerOptions.skipLibCheck).toBe(false);
    expect(tsconfig).toEqual(originalTsconfig);
  });

  it('should add skipLibCheck to tsconfig.json in monorepo packages', async () => {
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
          scripts: {
            build: 'skuba build-package',
          },
        },
        null,
        2,
      ),
      'packages/package-a/tsconfig.json': JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
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
      'packages/package-b/tsconfig.json': JSON.stringify({}, null, 2),
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
    const tsconfigAContent = result['packages/package-a/tsconfig.json']!;
    const tsconfigBContent = result['packages/package-b/tsconfig.json']!;

    expect(tsconfigAContent).toContain('"skipLibCheck": true');
    expect(tsconfigAContent).toContain('"target": "ES2020"');
    expect(tsconfigBContent).toContain('"skipLibCheck": true');
  });

  it('should preserve tsconfig.json comment when adding skipLibCheck', async () => {
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
      'tsconfig.json': `{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "target": "ES2020" // some comment about target
    }
  }
`,
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
    const tsconfigContent = result['tsconfig.json']!;
    expect(tsconfigContent).toContain('// tsdown has optional peer deps');
    expect(tsconfigContent).toContain('// some comment about target');
  });
});
