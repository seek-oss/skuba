import memfs, { vol } from 'memfs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { removeVitestImports } from './removeVitestImports.js';

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


describe('removeVitestImports', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  it('should remove Vitest imports from all test files', async () => {
    vol.fromJSON({
      'test.ts': `import { vi } from 'vitest';
      `,
    });

    await expect(
      removeVitestImports({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "test.ts": "      ",
      }
    `)
  });

  it('should return skip if no Vitest imports found', async () => {
    vol.fromJSON({
      'test.ts': '',
    });

    await expect(
      removeVitestImports({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'Vitest imports have already been removed',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "test.ts": "",
      }
    `)
  });

  it('should avoid modifying uneccessary imports', async () => {
    vol.fromJSON({
      'test.ts': `import { vi } from 'vitest';
import { defineConfig } from 'vitest/config';
import 'some-vitest-plugin';
      `,
    });

    await expect(
      removeVitestImports({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "test.ts": "import { defineConfig } from 'vitest/config';
      import 'some-vitest-plugin';
            ",
      }
    `)
  });


    
});
