import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../utils/packageManager.js';
import type {
  PatchConfig,
  PatchReturnType,
} from '../../../lint/internalLints/upgrade/index.js';

import { migrateToVitest } from './vitest.js';

vi.mock('../../../../utils/exec.js', () => ({
  createExec: () => vi.fn(),
  exec: vi.fn(),
}));
vi.mock('latest-version', () => ({
  default: vi.fn().mockResolvedValue('1.0.1'),
}));
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

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
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

describe('migrateToVitest', () => {
  it('should skip if vitest is already configured', async () => {
    vol.fromJSON({
      'vitest.config.ts': `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'vitest is already configured in this project',
    } satisfies PatchReturnType);
  });

  it('should return apply and not apply changes when mode is lint', async () => {
    vol.fromJSON({
      'package.json': `{
  "dependencies": {
    "aws-sdk-client-mock-jest": "4.1.0"
  }
}
`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "dependencies": {
          "aws-sdk-client-mock-jest": "4.1.0"
        }
      }
      ",
      }
    `);
  });

  it('should replace aws-sdk-client-mock-jest with aws-sdk-client-mock-vitest', async () => {
    vol.fromJSON({
      'package.json': `{
  "dependencies": {
    "aws-sdk-client-mock-jest": "4.1.0"
  }
}
`,
      'test/test.spec.ts': `import 'aws-sdk-client-mock-jest';

test('example test', () => {
  expect(true).toBe(true);
});
`,
      'pnpm-workspace.yaml': `catalog:
  aws-sdk-client-mock-jest: ^4.1.0
`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "dependencies": {
          "aws-sdk-client-mock-vitest": "7.0.1"
        }
      }
      ",
        "pnpm-workspace.yaml": "catalog:
        aws-sdk-client-mock-vitest: 7.0.1
      ",
        "test/test.spec.ts": "import 'aws-sdk-client-mock-vitest/extend';

      test('example test', () => {
        expect(true).toBe(true);
      });
      ",
      }
    `);
  });

  it('should replace @shopify/jest-koa-mocks with @skuba-lib/vitest-koa-mocks', async () => {
    vol.fromJSON({
      'package.json': `{
  "dependencies": {
    "@shopify/jest-koa-mocks": "5.1.0"
  }
}
`,
      'src/middleware.test.ts': `import { createMockContext } from '@shopify/jest-koa-mocks';

test('middleware', () => {
  const ctx = createMockContext();
  expect(ctx).toBeDefined();
});
`,
      'pnpm-workspace.yaml': `catalog:
  '@shopify/jest-koa-mocks': ^5.1.0
`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "dependencies": {
          "@skuba-lib/vitest-koa-mocks": "1.0.1"
        }
      }
      ",
        "pnpm-workspace.yaml": "catalog:
        '@skuba-lib/vitest-koa-mocks': 1.0.1
      ",
        "src/middleware.test.ts": "import { createMockContext } from '@skuba-lib/vitest-koa-mocks';

      test('middleware', () => {
        const ctx = createMockContext();
        expect(ctx).toBeDefined();
      });
      ",
      }
    `);
  });

  it('should replace --runInBand with --maxWorkers=1 in package.json scripts and buildkite files', async () => {
    vol.fromJSON({
      'package.json': `{
  "scripts": {
    "test": "skuba test --config=jest.config.ts --maxWorkers=1"
  }
}
`,
      '.buildkite/pipeline.yml': `steps:
  - command: pnpm test --config=jest.config.ts --maxWorkers=1
`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".buildkite/pipeline.yml": "steps:
        - command: pnpm test --config=vitest.config.ts --maxWorkers=1
      ",
        "package.json": "{
        "scripts": {
          "test": "skuba test --config=vitest.config.ts --maxWorkers=1"
        }
      }
      ",
      }
    `);
  });

  it('should replace empty .mockImplementation() calls in TypeScript files', async () => {
    vol.fromJSON({
      'package.json': `{
  "name": "test"
}
`,
      'src/service.test.ts': `import { myFn } from './service';

vi.mock('./service');

test('service', () => {
  vi.mocked(myFn).mockImplementation();
  myFn();
  expect(myFn).toHaveBeenCalled();
});
`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "name": "test"
      }
      ",
        "src/service.test.ts": "import { myFn } from './service';

      vi.mock('./service');

      test('service', () => {
        vi.mocked(myFn).mockImplementation(() => undefined);
        myFn();
        expect(myFn).toHaveBeenCalled();
      });
      ",
      }
    `);
  });

  it('should attempt to migrate jest.config.ts files', async () => {
    vol.fromJSON({
      'jest.config.ts': `import { Jest } from 'skuba';

const baseConfig = {
  testMatch: ['<rootDir>/extra-tests/**/*.test.ts'],
};

export default Jest.mergePreset({
  moduleNameMapper: {
    '^#src/(.*)\\.js$': [
      '<rootDir>/apps/api/src/$1',
      '<rootDir>/apps/worker/src/$1',
    ],
    '^#src/(.*)$': [
      '<rootDir>/apps/api/src/$1',
      '<rootDir>/apps/worker/src/$1',
    ],
  },
  clearMocks: true,
  coveragePathIgnorePatterns: [
    'src/listen\\.ts',
    'src/register\\.ts',
    'src/testing',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    './other': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
  globalSetup: '<rootDir>/jest.globalSetup.ts',
  setupFiles: ['<rootDir>/jest.setup.ts', '<rootDir>/jest.another.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.hooks.ts'],
  testPathIgnorePatterns: ['\\.int\\.test'],
  workerIdleMemoryLimit: '512MB',
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: 2,
  rootDir: './',
  testRegex: '\\.test\\.ts$',
  watchPathIgnorePatterns: ['<rootDir>/\\.tmp/', '<rootDir>/bar/'],
  ...baseConfig,
});
`,
      'jest.globalSetup.ts': `import { Net } from 'skuba';

const waitForApiDynamoDb = async () => {
  const dynamo = await Net.waitFor({
    host: 'preferences-dynamo',
    port: 8003,
    resolveCompose: !process.env.COMPOSE_NETWORK,
  });

  process.env.PREFERENCES_DYNAMODB_HOST = dynamo.host;
  process.env.PREFERENCES_DYNAMODB_PORT = String(dynamo.port);
};

module.exports = async () =>
  waitForApiDynamoDb();
`,
      'jest.setup.ts': `process.env.DEPLOYMENT = 'test';

afterEach(() => {
  process.env.DO_NOT_MIGRATE = 'true';
});
`,
      'jest.hooks.ts': `import 'some-hooks';
`,
      'jest.another.ts': `process.env.ENVIRONMENT = 'test';
export {}`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "jest.another.ts": "// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.

      process.env.ENVIRONMENT = 'test';
      export {}",
        "jest.config.ts": "// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.

      import { Jest } from 'skuba';

      const baseConfig = {
        testMatch: ['<rootDir>/extra-tests/**/*.test.ts'],
      };

      export default Jest.mergePreset({
        moduleNameMapper: {
          '^#src/(.*)\\.js$': [
            '<rootDir>/apps/api/src/$1',
            '<rootDir>/apps/worker/src/$1',
          ],
          '^#src/(.*)$': [
            '<rootDir>/apps/api/src/$1',
            '<rootDir>/apps/worker/src/$1',
          ],
        },
        clearMocks: true,
        coveragePathIgnorePatterns: [
          'src/listen\\.ts',
          'src/register\\.ts',
          'src/testing',
        ],
        coverageThreshold: {
          global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
          },
          './other': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
        testTimeout: 10000,
        globalSetup: '<rootDir>/jest.globalSetup.ts',
        setupFiles: ['<rootDir>/jest.setup.ts', '<rootDir>/jest.another.ts'],
        setupFilesAfterEnv: ['<rootDir>/jest.hooks.ts'],
        testPathIgnorePatterns: ['\\.int\\.test'],
        workerIdleMemoryLimit: '512MB',
        resetMocks: true,
        restoreMocks: true,
        maxWorkers: 2,
        rootDir: './',
        testRegex: '\\.test\\.ts$',
        watchPathIgnorePatterns: ['<rootDir>/\\.tmp/', '<rootDir>/bar/'],
        ...baseConfig,
      });
      ",
        "jest.globalSetup.ts": "// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.

      import { Net } from 'skuba';

      const waitForApiDynamoDb = async () => {
        const dynamo = await Net.waitFor({
          host: 'preferences-dynamo',
          port: 8003,
          resolveCompose: !process.env.COMPOSE_NETWORK,
        });

        process.env.PREFERENCES_DYNAMODB_HOST = dynamo.host;
        process.env.PREFERENCES_DYNAMODB_PORT = String(dynamo.port);
      };

      module.exports = async () =>
        waitForApiDynamoDb();
      ",
        "jest.hooks.ts": "// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.

      import 'some-hooks';
      ",
        "jest.setup.ts": "// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.

      process.env.DEPLOYMENT = 'test';

      afterEach(() => {
        process.env.DO_NOT_MIGRATE = 'true';
      });
      ",
        "vitest.config.ts": "import { Vitest } from 'skuba';
      import { defineConfig } from 'vitest/config';

      export default defineConfig(Vitest.mergePreset({
        ssr: {
          resolve: {
            conditions: ['@seek/skuba/source'],
          },
        },
        test: {
          env: {
            ENVIRONMENT: 'test',
            DEPLOYMENT: 'test',
          },
          coverage: {
            provider: 'istanbul',
            exclude: [
          'src/listen\\.ts',
          'src/register\\.ts',
          'src/testing',
        ], // TODO: Update these regexp pattern strings to globs
            thresholds: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
          
        
          './other': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
          },
          root: './',
          include: ['<rootDir>/extra-tests/**/*.test.ts', '\\.test\\.ts$'], // TODO: Update these regexp pattern strings to globs
          exclude: ['\\.int\\.test'], // TODO: Update these regexp pattern strings to globs
          globalSetup: ['vitest.globalSetup.ts'],
          setupFiles: ['vitest.setup.ts', 'vitest.hooks.ts'],
          testTimeout: 10000,
          restoreMocks: true,
          mockReset: true,
          clearMocks: true,
          vmMemoryLimit: '512MB',
          maxWorkers: 2,
          // TODO: A base config was detected and migrated below. This may have produced duplicate entries. 
          
          include: ['<rootDir>/extra-tests/**/*.test.ts'], // TODO: Update these regexp pattern strings to globs
        },
        server: {
          watch: {
            ignored: ['<rootDir>/\\.tmp/', '<rootDir>/bar/'], // TODO: Update these regexp pattern strings to globs
          },
        },
      }));
      ",
        "vitest.globalSetup.ts": "import { Net } from 'skuba';

      const waitForApiDynamoDb = async () => {
        const dynamo = await Net.waitFor({
          host: 'preferences-dynamo',
          port: 8003,
          resolveCompose: !process.env.COMPOSE_NETWORK,
        });

        process.env.PREFERENCES_DYNAMODB_HOST = dynamo.host;
        process.env.PREFERENCES_DYNAMODB_PORT = String(dynamo.port);
      };

      export const setup = async () =>
        {
       await waitForApiDynamoDb() };
      ",
        "vitest.hooks.ts": "import 'some-hooks';
      ",
        "vitest.setup.ts": "
      afterEach(() => {
        process.env.DO_NOT_MIGRATE = 'true';
      });
      ",
      }
    `);
  });

  it('should handle projects in jest.config.ts files', async () => {
    vol.fromJSON({
      'jest.config.ts': `import { Jest } from 'skuba';

export default Jest.mergePreset({
  projects: [
    {
      displayName: 'project1',
      testMatch: ['<rootDir>/project1/**/*.test.ts'],
    },
    {
      displayName: 'project2',
      testMatch: ['<rootDir>/project2/**/*.test.ts'],
    },
  ],
});
`,
    });

    await expect(
      migrateToVitest({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "jest.config.ts": "// This file was migrated from Jest to Vitest by skuba. Please verify the migration was successful and delete this file.

      import { Jest } from 'skuba';

      export default Jest.mergePreset({
        projects: [
          {
            displayName: 'project1',
            testMatch: ['<rootDir>/project1/**/*.test.ts'],
          },
          {
            displayName: 'project2',
            testMatch: ['<rootDir>/project2/**/*.test.ts'],
          },
        ],
      });
      ",
        "vitest.config.ts": "import { Vitest } from 'skuba';
      import { defineConfig } from 'vitest/config';

      export default defineConfig(Vitest.mergePreset({
        ssr: {
          resolve: {
            conditions: ['@seek/skuba/source'],
          },
        },
        test: {
          env: {
            ENVIRONMENT: 'test',
          },
          coverage: {
            provider: 'istanbul',
            exclude: ['src/testing'],
            thresholds: {
              branches: 100,
              functions: 100,
              lines: 100,
              statements: 100,
            },
          },
          projects: [
            {
              test: {
          name: 'project1',
          extends: true,
          include: ['<rootDir>/project1/**/*.test.ts'], // TODO: Update these regexp pattern strings to globs
      },
            },
            {
              test: {
          name: 'project2',
          extends: true,
          include: ['<rootDir>/project2/**/*.test.ts'], // TODO: Update these regexp pattern strings to globs
      },
            }
          ],
        },
      }));
      ",
      }
    `);
  });
});
