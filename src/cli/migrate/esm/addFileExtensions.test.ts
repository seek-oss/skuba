import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../utils/packageManager.js';
import type {
  PatchConfig,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.js';

import { addFileExtensions } from './addFileExtensions.js';

vi.mock('fs-extra', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('node:fs', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('node:fs/promises', () => ({
  default: memfs.fs.promises,
  ...memfs.fs.promises,
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

describe('addFileExtensions', () => {
  it('should skip if no .ts files are found', async () => {
    await expect(
      addFileExtensions({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no .ts files found',
    } satisfies PatchReturnType);
  });

  it('should add file extensions to imports', async () => {
    vol.fromJSON({
      'index.ts': `
import './deep';
import { foo } from './foo';
import { bar } from 'some-package/dist/deep/import';
const foo = vi.importActual<typeof import('./foo')>('./foo')`,
      'node_modules/some-package/dist/deep/import.js': '',
      'foo.ts': 'export const foo = 42;',
      'deep/index.ts': '',
    });

    await expect(
      addFileExtensions({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "deep/index.ts": "",
        "foo.ts": "export const foo = 42;",
        "index.ts": "import './deep/index.js';
      import { foo } from './foo.js';
      import { bar } from 'some-package/dist/deep/import.js';
      const foo = vi.importActual<typeof import('./foo.js')>('./foo.js')",
        "node_modules/some-package/dist/deep/import.js": "",
      }
    `);
  });

  it('should bail when the import cannot resolve to a file', async () => {
    vol.fromJSON({
      'index.ts': `
import './foo';
`,
    });

    await expect(
      addFileExtensions({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "index.ts": "import './foo';
      ",
      }
    `);
  });
});
