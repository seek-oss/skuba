import memfs, { vol } from 'memfs';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchTsconfig } from './patchTsconfig.js';

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

describe('patchTsconfig', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  it('should skip if no tsconfig.json files found', async () => {
    await expect(
      patchTsconfig({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsconfig.json files found',
    } satisfies PatchReturnType);
  });

  it('should skip if tsconfig.json files do not contain baseUrl config', async () => {
    vol.fromJSON({
      'tsconfig.json': '{ "compilerOptions": { "rootDir": "src" } }',
    });
    await expect(
      patchTsconfig({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsconfig.json files to patch',
    } satisfies PatchReturnType);
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: 'src',
        },
      }),
    });

    await expect(
      patchTsconfig({
        mode: 'lint',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsconfig.json": "{"compilerOptions":{"baseUrl":"src"}}",
      }
    `);
  });

  it('should return apply and modify files if mode is format', async () => {
    vol.fromJSON({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
        },
      }),
      'tsconfig.build.json': JSON.stringify({
        compilerOptions: {
          baseUrl: 'src',
        },
      }),
      'tsconfig.other.json': JSON.stringify({
        compilerOptions: {
          baseUrl: 'something',
          another: 'option',
        },
      }),
    });

    await expect(
      patchTsconfig({
        mode: 'format',
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsconfig.build.json": "{"compilerOptions":{}}",
        "tsconfig.json": "{"compilerOptions":{}}",
        "tsconfig.other.json": "{"compilerOptions":{"another":"option"}}",
      }
    `);
  });
});
