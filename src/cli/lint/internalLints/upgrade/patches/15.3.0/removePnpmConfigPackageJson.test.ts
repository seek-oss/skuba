import memfs, { vol } from 'memfs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { removePnpmConfigPackageJson } from './removePnpmConfigPackageJson.js';

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

describe('removePnpmConfigPackageJson', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  it('should skip if no package.json files found', async () => {
    await expect(
      removePnpmConfigPackageJson({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no package.json files found',
    } satisfies PatchReturnType);
  });

  it('should skip if package.json files do not contain pnpm config', async () => {
    vol.fromJSON({
      'package.json': '{ "name": "test" }',
    });
    await expect(
      removePnpmConfigPackageJson({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no package.json files to patch',
    } satisfies PatchReturnType);
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        name: 'test',
        pnpm: { configDependencies: { 'pnpm-plugin-skuba': '1.0.0' } },
      }),
    });

    await expect(
      removePnpmConfigPackageJson({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{"name":"test","pnpm":{"configDependencies":{"pnpm-plugin-skuba":"1.0.0"}}}",
      }
    `);
  });

  it('should remove pnpm-plugin-skuba from the config dependencies from package.json files', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        name: 'test',
        pnpm: {
          configDependencies: {
            'pnpm-plugin-skuba': '1.0.0',
            'pnpm-plugin-sku': '1.0.0',
          },
          overrides: [],
        },
      }),
    });

    await expect(
      removePnpmConfigPackageJson({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "pnpm": {
          "configDependencies": {
            "pnpm-plugin-sku": "1.0.0"
          },
          "overrides": []
        },
        "name": "test"
      }",
      }
    `);
  });

  it('should remove configDependencies if pnpm-plugin-skuba is the only config dependency', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        name: 'test',
        pnpm: {
          overrides: [],
          configDependencies: {
            'pnpm-plugin-skuba': '1.0.0',
          },
        },
      }),
    });

    await expect(
      removePnpmConfigPackageJson({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "pnpm": {
          "overrides": []
        },
        "name": "test"
      }",
      }
    `);
  });

  it('should remove pnpm config if configDependencies is the only field in pnpm', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        name: 'test',
        pnpm: {
          configDependencies: {
            'pnpm-plugin-skuba': '1.0.0',
          },
        },
      }),
    });

    await expect(
      removePnpmConfigPackageJson({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "name": "test"
      }",
      }
    `);
  });
});
