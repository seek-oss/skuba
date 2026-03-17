import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { migrateToVitest } from './migrateToVitest.js';

vi.mock('../../../../../../utils/exec.js');
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

      allowBuilds:
        '@ast-grep/lang-json': true # Managed by skuba
        '@ast-grep/lang-yaml': true # Managed by skuba
        '@datadog/native-appsec': true # Managed by skuba
        '@datadog/native-iast-taint-tracking': true # Managed by skuba
        '@datadog/native-metrics': true # Managed by skuba
        '@datadog/pprof': true # Managed by skuba
        dd-trace: true # Managed by skuba
        esbuild: true # Managed by skuba
        protobufjs: true # Managed by skuba
        unix-dgram: true # Managed by skuba
        unrs-resolver: true # Managed by skuba
      blockExoticSubdeps: true # Managed by skuba
      ignorePatchFailures: false # Managed by skuba
      minimumReleaseAge: 4320 # Managed by skuba
      minimumReleaseAgeExclude:
        - '@seek/*' # Managed by skuba
        - '@skuba-lib/*' # Managed by skuba
        - eslint-config-seek # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - eslint-plugin-skuba # Managed by skuba
        - pnpm-plugin-skuba # Managed by skuba
        - skuba # Managed by skuba
        - skuba-dive # Managed by skuba
        - tsconfig-seek # Managed by skuba
      packageManagerStrictVersion: true # Managed by skuba
      publicHoistPattern:
        - '@arethetypeswrong/core' # Managed by skuba
        - '@eslint/*' # Managed by skuba
        - '@types*' # Managed by skuba
        - '@vitest/*' # Managed by skuba
        - esbuild # Managed by skuba
        - eslint # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - prettier # Managed by skuba
        - publint # Managed by skuba
        - rolldown # Managed by skuba
        - tsconfig-seek # Managed by skuba
        - tsdown # Managed by skuba
        - typescript # Managed by skuba
        - vitest # Managed by skuba
      strictDepBuilds: false # Managed by skuba
      trustPolicy: off # Managed by skuba
      trustPolicyExclude:
        - semver@5.7.2 || 6.3.1 # Managed by skuba",
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

      allowBuilds:
        '@ast-grep/lang-json': true # Managed by skuba
        '@ast-grep/lang-yaml': true # Managed by skuba
        '@datadog/native-appsec': true # Managed by skuba
        '@datadog/native-iast-taint-tracking': true # Managed by skuba
        '@datadog/native-metrics': true # Managed by skuba
        '@datadog/pprof': true # Managed by skuba
        dd-trace: true # Managed by skuba
        esbuild: true # Managed by skuba
        protobufjs: true # Managed by skuba
        unix-dgram: true # Managed by skuba
        unrs-resolver: true # Managed by skuba
      blockExoticSubdeps: true # Managed by skuba
      ignorePatchFailures: false # Managed by skuba
      minimumReleaseAge: 4320 # Managed by skuba
      minimumReleaseAgeExclude:
        - '@seek/*' # Managed by skuba
        - '@skuba-lib/*' # Managed by skuba
        - eslint-config-seek # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - eslint-plugin-skuba # Managed by skuba
        - pnpm-plugin-skuba # Managed by skuba
        - skuba # Managed by skuba
        - skuba-dive # Managed by skuba
        - tsconfig-seek # Managed by skuba
      packageManagerStrictVersion: true # Managed by skuba
      publicHoistPattern:
        - '@arethetypeswrong/core' # Managed by skuba
        - '@eslint/*' # Managed by skuba
        - '@types*' # Managed by skuba
        - '@vitest/*' # Managed by skuba
        - esbuild # Managed by skuba
        - eslint # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - prettier # Managed by skuba
        - publint # Managed by skuba
        - rolldown # Managed by skuba
        - tsconfig-seek # Managed by skuba
        - tsdown # Managed by skuba
        - typescript # Managed by skuba
        - vitest # Managed by skuba
      strictDepBuilds: false # Managed by skuba
      trustPolicy: off # Managed by skuba
      trustPolicyExclude:
        - semver@5.7.2 || 6.3.1 # Managed by skuba",
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
});
