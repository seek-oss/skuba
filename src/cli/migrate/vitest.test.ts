import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../utils/packageManager.js';
import type {
  PatchConfig,
  PatchReturnType,
} from '../lint/internalLints/upgrade/index.js';

import { migrateToVitest } from './vitest.js';

vi.mock('../../utils/exec.js');
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
        '@shopify/jest-koa-mocks': ^5.1.0
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
    "test": "skuba test --runInBand"
  }
}
`,
      '.buildkite/pipeline.yml': `steps:
  - command: pnpm test --runInBand
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
        - command: pnpm test --maxWorkers=1
      ",
        "package.json": "{
        "scripts": {
          "test": "skuba test --maxWorkers=1"
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
        vi.mocked(myFn).mockImplementation(() => {
        /* empty */
      });
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
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.hooks.ts'],
  testPathIgnorePatterns: ['\\.int\\.test'],
  workerIdleMemoryLimit: '512MB',
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
        },
        setupFiles: ['<rootDir>/jest.setup.ts'],
        setupFilesAfterEnv: ['<rootDir>/jest.hooks.ts'],
        testPathIgnorePatterns: ['\\.int\\.test'],
        workerIdleMemoryLimit: '512MB',
      });
      ",
        "vitest.config.ts": "import { defineConfig } from 'vitest/config';

      export default defineConfig({
        test: {
          include: ['src/**/*.test.ts'],
          coverage: {
            include: ['src'],
            thresholds: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
          },
          },
        },
      });
      ",
      }
    `);
  });
});
