import path from 'path';

import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import {
  addJsExtensionForFile,
  tryAddJsExtensionToImports,
} from './addJsExtensionToImports.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));

vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

beforeEach(() => vol.reset());

const fakeFile = path.join(process.cwd(), 'src/app.ts');

describe('addJsExtensionForFile', () => {
  it('should add .js to third-party subpath import', async () => {
    await expect(
      addJsExtensionForFile(
        "import { GaxiosError } from 'gaxios/build/src/common';",
        fakeFile,
      ),
    ).resolves.toBe("import { GaxiosError } from 'gaxios/build/src/common.js';");
  });

  it('should add .js to relative import without extension', async () => {
    await expect(
      addJsExtensionForFile("import { foo } from './utils';", fakeFile),
    ).resolves.toBe("import { foo } from './utils.js';");
  });

  it('should add .js to parent relative import without extension', async () => {
    await expect(
      addJsExtensionForFile("import { bar } from '../common';", fakeFile),
    ).resolves.toBe("import { bar } from '../common.js';");
  });

  it('should add .js to export from with subpath', async () => {
    await expect(
      addJsExtensionForFile(
        "export { default } from 'skuba/config/prettier';",
        fakeFile,
      ),
    ).resolves.toBe("export { default } from 'skuba/config/prettier.js';");
  });

  it('should not add .js to bare package import', async () => {
    await expect(
      addJsExtensionForFile("import lodash from 'lodash';", fakeFile),
    ).resolves.toBe("import lodash from 'lodash';");
  });

  it('should not add .js to scoped package import', async () => {
    await expect(
      addJsExtensionForFile(
        "import { foo } from '@seek/skuba/config/prettier';",
        fakeFile,
      ),
    ).resolves.toBe("import { foo } from '@seek/skuba/config/prettier';");
  });

  it('should not add .js to scoped package without subpath', async () => {
    await expect(
      addJsExtensionForFile("import foo from '@seek/skuba';", fakeFile),
    ).resolves.toBe("import foo from '@seek/skuba';");
  });

  it('should not add .js if extension already present', async () => {
    await expect(
      addJsExtensionForFile(
        "import { foo } from 'gaxios/build/src/common.js';",
        fakeFile,
      ),
    ).resolves.toBe("import { foo } from 'gaxios/build/src/common.js';");
  });

  it('should not add .js to .json import', async () => {
    await expect(
      addJsExtensionForFile("import config from './config.json';", fakeFile),
    ).resolves.toBe("import config from './config.json';");
  });

  it('should not add .js to .mjs import', async () => {
    await expect(
      addJsExtensionForFile(
        "import { foo } from './utils.mjs';",
        fakeFile,
      ),
    ).resolves.toBe("import { foo } from './utils.mjs';");
  });

  it('should handle multiple imports in one file', async () => {
    const input = [
      "import { GaxiosError } from 'gaxios/build/src/common';",
      "import { foo } from './utils';",
      "import lodash from 'lodash';",
      "import { bar } from '@scope/pkg/sub';",
    ].join('\n');

    const expected = [
      "import { GaxiosError } from 'gaxios/build/src/common.js';",
      "import { foo } from './utils.js';",
      "import lodash from 'lodash';",
      "import { bar } from '@scope/pkg/sub';",
    ].join('\n');

    await expect(addJsExtensionForFile(input, fakeFile)).resolves.toBe(
      expected,
    );
  });

  it('should handle double-quoted imports', async () => {
    await expect(
      addJsExtensionForFile(
        'import { GaxiosError } from "gaxios/build/src/common";',
        fakeFile,
      ),
    ).resolves.toBe('import { GaxiosError } from "gaxios/build/src/common.js";');
  });

  it('should resolve directory import to index.js', async () => {
    vol.fromJSON({
      'src/config/index.ts': 'export const x = 1;',
    });

    const filePath = path.join(process.cwd(), 'src/app.ts');

    await expect(
      addJsExtensionForFile("import { x } from './config';", filePath),
    ).resolves.toBe("import { x } from './config/index.js';");
  });

  it('should resolve parent directory import to index.js', async () => {
    vol.fromJSON({
      'src/config/index.ts': 'export const x = 1;',
    });

    const filePath = path.join(process.cwd(), 'src/utils/helper.ts');

    await expect(
      addJsExtensionForFile("import { x } from '../config';", filePath),
    ).resolves.toBe("import { x } from '../config/index.js';");
  });
});

describe('tryAddJsExtensionToImports', () => {
  const baseArgs = {
    manifest: {
      path: path.join(process.cwd(), 'package.json'),
      packageJson: {},
    } as PatchConfig['manifest'],
    packageManager: configForPackageManager('yarn'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)(
    '%s',
    (mode: 'lint' | 'format') => {
      it('should skip if no source files found', async () => {
        vol.fromJSON({ 'package.json': '{}' });

        await expect(
          tryAddJsExtensionToImports({ ...baseArgs, mode }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no source files found',
        });
      });

      it('should skip if no imports need .js extension', async () => {
        vol.fromJSON({
          'src/index.ts': "import lodash from 'lodash';\n",
        });

        await expect(
          tryAddJsExtensionToImports({ ...baseArgs, mode }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no import specifiers need .js extension',
        });

        expect(volToJson()).toEqual({
          'src/index.ts': "import lodash from 'lodash';\n",
        });
      });

      it('should add .js to gaxios subpath import', async () => {
        const input =
          "import { GaxiosError } from 'gaxios/build/src/common';\n";
        const expected =
          "import { GaxiosError } from 'gaxios/build/src/common.js';\n";

        vol.fromJSON({ 'src/api.ts': input });

        await expect(
          tryAddJsExtensionToImports({ ...baseArgs, mode }),
        ).resolves.toEqual({ result: 'apply' });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'src/api.ts': input }
            : { 'src/api.ts': expected },
        );
      });

      it('should not transform scoped package imports', async () => {
        vol.fromJSON({
          'src/api.ts':
            "import { foo } from '@seek/skuba/config/prettier';\n",
        });

        await expect(
          tryAddJsExtensionToImports({ ...baseArgs, mode }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no import specifiers need .js extension',
        });
      });

      it('should resolve directory import to index.js', async () => {
        vol.fromJSON({
          'src/app.ts': "import { x } from './config';\n",
          'src/config/index.ts': 'export const x = 1;\n',
        });

        await expect(
          tryAddJsExtensionToImports({ ...baseArgs, mode }),
        ).resolves.toEqual({ result: 'apply' });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? {
                'src/app.ts': "import { x } from './config';\n",
                'src/config/index.ts': 'export const x = 1;\n',
              }
            : {
                'src/app.ts': "import { x } from './config/index.js';\n",
                'src/config/index.ts': 'export const x = 1;\n',
              },
        );
      });

      it('should not modify files that already have .js extensions', async () => {
        vol.fromJSON({
          'src/api.ts':
            "import { GaxiosError } from 'gaxios/build/src/common.js';\n",
        });

        await expect(
          tryAddJsExtensionToImports({ ...baseArgs, mode }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no import specifiers need .js extension',
        });
      });
    },
  );
});
