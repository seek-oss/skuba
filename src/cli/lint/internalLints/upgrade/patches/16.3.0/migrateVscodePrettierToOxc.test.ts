import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import { migrateVscodePrettierToOxc } from './migrateVscodePrettierToOxc.js';

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
}));

const findRoot = vi.mocked(Git.findRoot);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const baseArgs = { mode: 'format' } as PatchConfig;

describe('migrateVscodePrettierToOxc', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('skips when no extensions.json files contain Prettier', async () => {
    vol.fromJSON({
      '.vscode/extensions.json': `{
  "recommendations": ["dbaeumer.vscode-eslint"]
}
`,
    });

    await expect(migrateVscodePrettierToOxc(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no Prettier VS Code recommendations to replace',
    } satisfies PatchReturnType);
  });

  it('skips when Oxc is already recommended', async () => {
    const input = {
      '.vscode/extensions.json': `{
  "recommendations": ["oxc.oxc-vscode", "esbenp.prettier-vscode"]
}
`,
    };
    vol.fromJSON(input);

    await expect(migrateVscodePrettierToOxc(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no Prettier VS Code recommendations to replace',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('does not write in lint mode', async () => {
    const input = {
      '.vscode/extensions.json': `{
  "recommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"]
}
`,
    };
    vol.fromJSON(input);

    await expect(
      migrateVscodePrettierToOxc({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('replaces the Prettier extension with Oxc', async () => {
    vol.fromJSON({
      '.vscode/extensions.json': `{
  "recommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"]
}
`,
    });

    await expect(migrateVscodePrettierToOxc(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".vscode/extensions.json": "{
        "recommendations": ["oxc.oxc-vscode", "dbaeumer.vscode-eslint"]
      }
      ",
      }
    `);
  });

  it('replaces Prettier extensions in nested workspaces', async () => {
    vol.fromJSON({
      '.vscode/extensions.json': `{
  "recommendations": ["esbenp.prettier-vscode"]
}
`,
      'packages/foo/.vscode/extensions.json': `{
  "recommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"]
}
`,
    });

    await expect(migrateVscodePrettierToOxc(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        ".vscode/extensions.json": "{
        "recommendations": ["oxc.oxc-vscode"]
      }
      ",
        "packages/foo/.vscode/extensions.json": "{
        "recommendations": ["oxc.oxc-vscode", "dbaeumer.vscode-eslint"]
      }
      ",
      }
    `);
  });
});
