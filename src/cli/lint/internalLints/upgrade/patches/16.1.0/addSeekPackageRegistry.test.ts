import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { addSeekPackageRegistry } from './addSeekPackageRegistry.js';

import * as Git from '@skuba-lib/api/git';

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

vi.mock('@skuba-lib/api/git', async () => ({
  ...(await vi.importActual<object>('@skuba-lib/api/git')),
  findRoot: vi.fn(),
  getOwnerAndRepo: vi.fn(),
}));

const findRoot = vi.mocked(Git.findRoot);
const getOwnerAndRepo = vi.mocked(Git.getOwnerAndRepo);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

describe('addSeekPackageRegistry', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });

    findRoot.mockResolvedValue(process.cwd());
    getOwnerAndRepo.mockResolvedValue({ owner: 'SEEK-Jobs', repo: 'my-repo' });
  });

  it('should skip if no Git root found', async () => {
    findRoot.mockResolvedValue(null);

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Git root found',
    } satisfies PatchReturnType);
  });

  it('should skip if not a SEEK-Jobs repository', async () => {
    getOwnerAndRepo.mockResolvedValue({
      owner: 'some-other-org',
      repo: 'my-repo',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'not a SEEK-Jobs repository',
    } satisfies PatchReturnType);
  });

  it('should create a .npmrc with the SEEK registry if none exists', async () => {
    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".npmrc": "@seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
      }
    `);
  });

  it('should return apply and not create a .npmrc if mode is lint and none exists', async () => {
    await expect(
      addSeekPackageRegistry({ mode: 'lint' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`{}`);
  });

  it('should skip if all .npmrc files already have the SEEK registry', async () => {
    vol.fromJSON({
      '.npmrc': '@seek:registry=https://npm.cloudsmith.io/seek/npm/\n',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'all .npmrc files already have the SEEK registry',
    } satisfies PatchReturnType);
  });

  it('should return apply and not modify files if mode is lint', async () => {
    vol.fromJSON({
      '.npmrc': 'legacy-peer-deps=true\n',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'lint' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".npmrc": "legacy-peer-deps=true
      ",
      }
    `);
  });

  it('should add the SEEK registry to .npmrc files', async () => {
    vol.fromJSON({
      '.npmrc': 'legacy-peer-deps=true\n',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".npmrc": "legacy-peer-deps=true
      @seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
      }
    `);
  });

  it('should add the SEEK registry to multiple .npmrc files', async () => {
    vol.fromJSON({
      '.npmrc': 'legacy-peer-deps=true\n',
      'packages/foo/.npmrc': 'legacy-peer-deps=true\n',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".npmrc": "legacy-peer-deps=true
      @seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
        "packages/foo/.npmrc": "legacy-peer-deps=true
      @seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
      }
    `);
  });

  it('should only patch .npmrc files that are missing the SEEK registry', async () => {
    vol.fromJSON({
      '.npmrc': 'legacy-peer-deps=true\n',
      'packages/foo/.npmrc':
        '@seek:registry=https://npm.cloudsmith.io/seek/npm/\n',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".npmrc": "legacy-peer-deps=true
      @seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
        "packages/foo/.npmrc": "@seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
      }
    `);
  });

  it('should handle .npmrc files with trailing whitespace without double blank lines', async () => {
    vol.fromJSON({
      '.npmrc': 'legacy-peer-deps=true   \n',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".npmrc": "legacy-peer-deps=true
      @seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
      }
    `);
  });
});
