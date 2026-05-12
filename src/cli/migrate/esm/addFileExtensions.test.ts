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

  it.only('should add file extensions to imports', async () => {
    vol.fromJSON({
      'index.ts': `
import './deep';
import { foo } from './foo';
import { bar } from 'some-package/dist/deep/import';
import type { SomeType } from 'some-package/dist/deep/dts';
const foo = vi.importActual<typeof import('./foo')>('./foo')
vi.mock('./foo')
vi.doMock('#src/foo')`,
      'node_modules/some-package/dist/deep/dts.d.ts': '',
      'node_modules/some-package/dist/deep/import.js': '',
      'foo.ts': 'export const foo = 42;',
      'deep/index.ts': '',
      'src/foo.ts': 'export const foo = 42;',
      'package.json': JSON.stringify({
        imports: {
          '#src/*': {
            '@seek/my-condition/source': './src/*',
            default: './lib/*',
          },
        },
      }),
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
      import type { SomeType } from 'some-package/dist/deep/dts.js';
      const foo = vi.importActual<typeof import('./foo.js')>('./foo.js')
      vi.mock('./foo.js')
      vi.doMock('#src/foo.js')",
        "node_modules/some-package/dist/deep/dts.d.ts": "",
        "node_modules/some-package/dist/deep/import.js": "",
        "package.json": "{"imports":{"#src/*":{"@seek/my-condition/source":"./src/*","default":"./lib/*"}}}",
        "src/foo.ts": "export const foo = 42;",
      }
    `);
  });

  it('should bail when the import cannot resolve to a file', async () => {
    vol.fromJSON({
      'index.ts': `
import path from 'node:path';
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
        "index.ts": "import path from 'node:path';
      import './foo';
      ",
      }
    `);
  });
});
