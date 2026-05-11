import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { addSeekPackageRegistry } from './addSeekPackageRegistry.js';

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

describe('addSeekPackageRegistry', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(() => {
    vi.spyOn(git, 'listRemotes').mockResolvedValue([
      { remote: 'origin', url: 'https://github.com/SEEK-Jobs/my-repo.git' },
    ]);
  });

  it('should skip if not a SEEK-Jobs repository', async () => {
    vi.spyOn(git, 'listRemotes').mockResolvedValue([
      {
        remote: 'origin',
        url: 'https://github.com/some-other-org/my-repo.git',
      },
    ]);

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'not a SEEK-Jobs repository',
    } satisfies PatchReturnType);
  });

  it('should skip if no .npmrc files found', async () => {
    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no .npmrc files found',
    } satisfies PatchReturnType);
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

  it('should add the SEEK registry to an .npmrc file that only contains a node version', async () => {
    vol.fromJSON({
      '.npmrc': '24\n',
    });

    await expect(
      addSeekPackageRegistry({ mode: 'format' } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".npmrc": "24
      @seek:registry=https://npm.cloudsmith.io/seek/npm/
      ",
      }
    `);
  });
});
