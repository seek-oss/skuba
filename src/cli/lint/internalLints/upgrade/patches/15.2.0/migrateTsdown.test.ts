import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { migrateTsdown } from './migrateTsdown.js';

vi.mock('../../../../../../utils/exec.js', () => ({
  createExec: () => vi.fn(),
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

describe('migrateTsdown', () => {
  it('should skip if no tsdown configs are found', async () => {
    vol.fromJSON({
      'index.ts': '',
    });

    await expect(
      migrateTsdown({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsdown.config files found',
    } satisfies PatchReturnType);
  });

  it('should skip if no fields to migrate are found', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  outDir: 'docs',
  attw: true,
  publint: true,
  failOnWarn: 'ci-only',
});
      `,
    });

    await expect(
      migrateTsdown({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsdown.config fields to migrate',
    } satisfies PatchReturnType);
  });

  it('should migrate fields in tsdown.config.mts', async () => {
    vol.fromJSON({
      'tsdown.config.mts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  external: ['foo'],
  noExternal: ['bar'],
  inlineOnly: true,
  skipNodeModulesBundle: true,
});
      `,
    });

    await expect(
      migrateTsdown({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsdown.config.mts": "import { defineConfig } from 'tsdown/config';

      export default defineConfig({
        deps: {
          neverBundle: ['foo'],
          alwaysBundle: ['bar'],
          onlyBundle: true,
          skipNodeModulesBundle: true
        },
        failOnWarn: true,
        entry: 'src/index.ts',
        
        
        
        
      });
            ",
      }
    `);
  });

  it('should add failOnWarn to tsdown.config.mts', async () => {
    vol.fromJSON({
      'tsdown.config.mts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
});`,
    });

    await expect(
      migrateTsdown({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsdown.config.mts": "import { defineConfig } from 'tsdown/config';

      export default defineConfig({
        
        failOnWarn: true,
        entry: 'src/index.ts',
      });",
      }
    `);
  });
});
