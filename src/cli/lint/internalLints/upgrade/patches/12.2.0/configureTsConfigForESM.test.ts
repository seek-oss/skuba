import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import {
  configureTsConfigForESM,
  tryConfigureTsConfigForESM,
} from './configureTsConfigForESM.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: string, opts: { ignore: string[] }) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

const mockGetOwnerAndRepo = jest.fn();
jest.mock('../../../../../../index.js', () => ({
  Git: {
    getOwnerAndRepo: (...args: unknown[]) => mockGetOwnerAndRepo(...args),
  },
}));

jest.mock('../../../../../../utils/logging.js', () => ({
  log: {
    warn: jest.fn(),
    subtle: jest.fn(),
  },
}));

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
  mockGetOwnerAndRepo.mockResolvedValue({ repo: 'test-repo' });
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

describe('tryConfigureTsConfigForESM', () => {
  describe('when no repository name is found', () => {
    it('should skip if repository name cannot be determined', async () => {
      mockGetOwnerAndRepo.mockResolvedValue({ repo: undefined });

      await expect(
        tryConfigureTsConfigForESM({
          ...baseArgs,
          mode: 'lint',
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no repository name found',
      });
    });
  });

  describe('when repository name is available', () => {
    beforeEach(() => {
      mockGetOwnerAndRepo.mockResolvedValue({ repo: 'my-awesome-repo' });
    });

    describe('lint mode', () => {
      it('should return apply result without modifying files', async () => {
        const packageJsonContent = {
          name: 'test-package',
          version: '1.0.0',
        };

        vol.fromJSON({
          'package.json': JSON.stringify(packageJsonContent, null, 2),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'lint',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual({
          'package.json': JSON.stringify(packageJsonContent, null, 2),
        });
      });
    });

    describe('format mode', () => {
      it('should configure package.json with imports field', async () => {
        vol.fromJSON({
          'package.json': JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
          }),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        if (!files['package.json']) {
          throw new Error('package.json not found');
        }

        const updatedPackageJson = JSON.parse(files['package.json']);

        expect(updatedPackageJson).toEqual({
          name: 'test-package',
          version: '1.0.0',
          imports: {
            '#src/*': {
              '@seek/my-awesome-repo/source': './src/*',
              default: './lib/*',
            },
          },
        });
      });

      it('should configure nested package.json with imports field', async () => {
        vol.fromJSON({
          'package.json': JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
          }),
          'apps/api/package.json': JSON.stringify({
            name: 'api',
            version: '1.0.0',
          }),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();

        const updatedPackageJson = JSON.parse(files['package.json']!);
        const updatedApiPackageJson = JSON.parse(
          files['apps/api/package.json']!,
        );

        expect(updatedPackageJson.imports).toEqual({
          '#src/*': {
            '@seek/my-awesome-repo/source': './src/*',
            default: './lib/*',
          },
        });
        expect(updatedApiPackageJson.imports).toEqual({
          '#src/*': {
            '@seek/my-awesome-repo/source': './src/*',
            default: './lib/*',
          },
        });
      });

      it('should configure tsconfig.json with custom conditions', async () => {
        const tsconfigContent = {
          compilerOptions: {
            target: 'es2019',
            module: 'commonjs',
          },
        };

        vol.fromJSON({
          'tsconfig.json': JSON.stringify(tsconfigContent, null, 2),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        if (!files['tsconfig.json']) {
          throw new Error('tsconfig.json not found');
        }

        const updatedTsconfig = JSON.parse(files['tsconfig.json']);

        expect(updatedTsconfig.compilerOptions.customConditions).toEqual([
          '@seek/my-awesome-repo/source',
        ]);
        expect(updatedTsconfig.compilerOptions.rootDir).toBe('.');
        expect(updatedTsconfig.compilerOptions.paths).toBeUndefined();
      });

      it('should skip tsconfig.json that extends another project configuration', async () => {
        const tsconfigContent = {
          extends: '../../tsconfig.base.json',
          compilerOptions: {
            outDir: './dist',
          },
        };

        vol.fromJSON({
          'tsconfig.json': JSON.stringify(tsconfigContent, null, 2),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        expect(files['tsconfig.json']).toBe(
          JSON.stringify(tsconfigContent, null, 2),
        );
      });

      it('should handle tsconfig.json with comments', async () => {
        const tsconfigContent = `{
          "compilerOptions": {
            "lib": [
              // apollographql/apollo-client#6376
              "DOM",
              "ES2024"
            ],
            "paths": {
              "src": ["src"]
            }
          },
          "extends": "skuba/config/tsconfig.json"
        }`;

        vol.fromJSON({
          'tsconfig.json': tsconfigContent,
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        if (!files['tsconfig.json']) {
          throw new Error('tsconfig.json not found');
        }

        const updatedTsconfig = JSON.parse(files['tsconfig.json']);

        expect(updatedTsconfig.compilerOptions.customConditions).toEqual([
          '@seek/my-awesome-repo/source',
        ]);
        expect(updatedTsconfig.compilerOptions.rootDir).toBe('.');
        expect(updatedTsconfig.compilerOptions.paths).toBeUndefined();
      });

      it('should handle nested package.json and tsconfig.json files', async () => {
        vol.fromJSON({
          'package.json': JSON.stringify({ name: 'root' }, null, 2),
          'apps/api/package.json': JSON.stringify({ name: 'api' }, null, 2),
          'tsconfig.json': JSON.stringify({ compilerOptions: {} }, null, 2),
          'apps/api/tsconfig.json': JSON.stringify(
            { compilerOptions: {} },
            null,
            2,
          ),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        if (!files['package.json']) {
          throw new Error('package.json not found');
        }

        const rootPackage = JSON.parse(files['package.json']);
        if (!files['apps/api/package.json']) {
          throw new Error('apps/api/package.json not found');
        }

        const apiPackage = JSON.parse(files['apps/api/package.json']);

        expect(rootPackage.imports).toEqual({
          '#src/*': {
            '@seek/my-awesome-repo/source': './src/*',
            default: './lib/*',
          },
        });
        expect(apiPackage.imports).toEqual({
          '#src/*': {
            '@seek/my-awesome-repo/source': './src/*',
            default: './lib/*',
          },
        });
      });

      it('should skip custom condition if already present', async () => {
        const tsconfigContent = {
          compilerOptions: {
            customConditions: ['@seek/my-awesome-repo/source'],
            target: 'es2019',
          },
        };

        const originalContent = JSON.stringify(tsconfigContent, null, 2);

        vol.fromJSON({
          'tsconfig.json': originalContent,
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();

        expect(files['tsconfig.json']).toBe(originalContent);
      });

      it('should ignore node_modules and build files', async () => {
        vol.fromJSON({
          'package.json': JSON.stringify({ name: 'root' }, null, 2),
          'node_modules/some-package/package.json': JSON.stringify(
            { name: 'dependency' },
            null,
            2,
          ),
          'tsconfig.build.json': JSON.stringify(
            { compilerOptions: {} },
            null,
            2,
          ),
          'apps/api/tsconfig.build.json': JSON.stringify(
            { compilerOptions: {} },
            null,
            2,
          ),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();

        expect(files['node_modules/some-package/package.json']).toBe(
          JSON.stringify({ name: 'dependency' }, null, 2),
        );
        expect(files['tsconfig.build.json']).toBe(
          JSON.stringify({ compilerOptions: {} }, null, 2),
        );
      });

      it('should handle malformed JSON files gracefully', async () => {
        vol.fromJSON({
          'package.json': '{ invalid json',
          'tsconfig.json': '{ also invalid',
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        expect(files['package.json']).toBe('{ invalid json');
        expect(files['tsconfig.json']).toBe('{ also invalid');
      });

      it('should configure Jest config files with moduleNameMapper for monorepos', async () => {
        const jestConfigContent = {
          testEnvironment: 'node',
          preset: 'ts-jest',
        };

        vol.fromJSON({
          'package.json': JSON.stringify({ name: 'root' }, null, 2),
          'apps/api/package.json': JSON.stringify({ name: 'api' }, null, 2),
          'apps/worker/package.json': JSON.stringify(
            { name: 'worker' },
            null,
            2,
          ),
          'jest.config.ts': JSON.stringify(jestConfigContent, null, 2),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        if (!files['jest.config.ts']) {
          throw new Error('jest.config.ts not found');
        }

        const updatedJestConfig = JSON.parse(files['jest.config.ts']);

        expect(updatedJestConfig.testEnvironment).toBe('node');
        expect(updatedJestConfig.preset).toBe('ts-jest');
        expect(updatedJestConfig.moduleNameMapper).toEqual({
          '^#src$': ['<rootDir>/apps/api/src', '<rootDir>/apps/worker/src'],
          '^#src/(.*)\\.js$': [
            '<rootDir>/apps/api/src/$1',
            '<rootDir>/apps/worker/src/$1',
          ],
          '^#src\/(.*)$': [
            '<rootDir>/apps/api/src/$1',
            '<rootDir>/apps/worker/src/$1',
          ],
        });
      });

      it('should not configure Jest config files with moduleNameMapper for microservices', async () => {
        const jestConfigContent = {
          testEnvironment: 'node',
          preset: 'ts-jest',
        };

        vol.fromJSON({
          'package.json': JSON.stringify({ name: 'root' }, null, 2),
          'jest.config.ts': JSON.stringify(jestConfigContent, null, 2),
        });

        await expect(
          tryConfigureTsConfigForESM({
            ...baseArgs,
            mode: 'format',
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        const files = volToJson();
        if (!files['jest.config.ts']) {
          throw new Error('jest.config.ts not found');
        }

        const updatedJestConfig = JSON.parse(files['jest.config.ts']);

        expect(updatedJestConfig.testEnvironment).toBe('node');
        expect(updatedJestConfig.preset).toBe('ts-jest');
        expect(updatedJestConfig.moduleNameMapper).toBeUndefined();
      });
    });

    it('should configure TypeScript jest config with moduleNameMapper', async () => {
      const jestConfigContent = `
      import { Jest } from 'skuba';
      export default Jest.mergePreset({
        clearMocks: true,
        coveragePathIgnorePatterns: [
          'src/listen\\.ts',
          'src/register\\.ts',
          'src/testing',
        ],
        coverageThreshold: {
          global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
          },
        },
        setupFiles: ['<rootDir>/jest.setup.ts'],
        setupFilesAfterEnv: ['<rootDir>/jest.hooks.ts'],
        testPathIgnorePatterns: ['\\.int\\.test'],
        workerIdleMemoryLimit: '512MB',
      });`;

      vol.fromJSON({
        'package.json': JSON.stringify({ name: 'root' }, null, 2),
        'apps/api/package.json': JSON.stringify({ name: 'api' }, null, 2),
        'apps/web/package.json': JSON.stringify({ name: 'web' }, null, 2),
        'jest.config.ts': jestConfigContent,
      });

      await expect(
        tryConfigureTsConfigForESM({
          ...baseArgs,
          mode: 'format',
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      const files = volToJson();
      if (!files['jest.config.ts']) {
        throw new Error('jest.config.ts not found');
      }

      const updatedJestConfig = files['jest.config.ts'];

      expect(updatedJestConfig).toContain(`moduleNameMapper: {
    \"^#src$\": [
      \"<rootDir>/apps/api/src\",
      \"<rootDir>/apps/web/src\"
    ],
    \"^#src/(.*)\\\\.js$\": [
      \"<rootDir>/apps/api/src/$1\",
      \"<rootDir>/apps/web/src/$1\"
    ],
    \"^#src/(.*)$\": [
      \"<rootDir>/apps/api/src/$1\",
      \"<rootDir>/apps/web/src/$1\"
    ]
  },`);
    });
  });
});

describe('configureTsConfigForESM', () => {
  beforeEach(() => {
    mockGetOwnerAndRepo.mockResolvedValue({ repo: 'test-repo' });
  });

  it('should handle errors gracefully', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    mockGetOwnerAndRepo.mockRejectedValue(new Error('Git error'));

    vol.fromJSON({
      'package.json': JSON.stringify({ name: 'test' }, null, 2),
    });

    await expect(configureTsConfigForESM(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'due to an error',
    });

    mockConsoleError.mockRestore();
  });

  it('should delegate to tryConfigureTsConfigForESM when successful', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({ name: 'test' }, null, 2),
    });

    await expect(configureTsConfigForESM(baseArgs)).resolves.toEqual({
      result: 'apply',
    });
  });
});
