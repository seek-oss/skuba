import path from 'node:path';

import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import {
  buildTsFileSet,
  rewriteImportPathExtensions,
  tryRewriteRelativePathExtensions,
} from './rewriteRelativePathExtensions.js';
import {
  type PackageJson,
  addSrcJsonSubpathImportsMapping,
  tryAddPackageJsonJsonImports,
  tryUpdatePackageJsonImports,
  updateSrcSubpathImportsMapping,
} from './updatePackageJsonImports.js';

const defaultTestFile = path.join(process.cwd(), 'src/app.ts');

const defaultTsFileSet = buildTsFileSet([
  defaultTestFile,
  path.join(process.cwd(), 'src/imported-module.ts'),
  path.join(process.cwd(), 'src/register.ts'),
  path.join(process.cwd(), 'imported-module.ts'),
  path.join(process.cwd(), 'src/a.ts'),
]);

const rewriteImports = (
  contents: string,
  {
    file = defaultTestFile,
    tsFileSet = defaultTsFileSet,
  }: { file?: string; tsFileSet?: ReturnType<typeof buildTsFileSet> } = {},
) => rewriteImportPathExtensions(contents, file, tsFileSet);

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

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => vol.reset());

describe('rewriteImportPathExtensions', () => {
  it.each([
    [
      'named import',
      "import { module } from './imported-module.js';",
      "import { module } from './imported-module.ts';",
    ],
    [
      'parent directory import',
      'import { module } from "../../imported-module.js";',
      'import { module } from "../../imported-module.ts";',
    ],
    [
      'side-effect import',
      "import './register.js';",
      "import './register.ts';",
    ],
    [
      'type-only import',
      "import type { Module } from './imported-module.js';",
      "import type { Module } from './imported-module.ts';",
    ],
    [
      'namespace import',
      "import * as module from './imported-module.js';",
      "import * as module from './imported-module.ts';",
    ],
    [
      'mixed default and named import',
      "import module, { named } from './imported-module.js';",
      "import module, { named } from './imported-module.ts';",
    ],
    [
      'multi-line import',
      `import {
  a,
  b,
} from './imported-module.js';`,
      `import {
  a,
  b,
} from './imported-module.ts';`,
    ],
    [
      're-export',
      "export { module } from './imported-module.js';",
      "export { module } from './imported-module.ts';",
    ],
    [
      'namespace re-export',
      "export * from './imported-module.js';",
      "export * from './imported-module.ts';",
    ],
    [
      'dynamic import',
      "const module = await import('./imported-module.js');",
      "const module = await import('./imported-module.ts');",
    ],
    [
      'module mock',
      "vi.mock('./imported-module.js');",
      "vi.mock('./imported-module.ts');",
    ],
    [
      'import actual with generic',
      "vi.importActual<typeof import('./imported-module.js')>('./imported-module.js');",
      "vi.importActual<typeof import('./imported-module.ts')>('./imported-module.ts');",
    ],
  ])(
    'should rewrite a relative %s to .ts',
    (_: string, input: string, expected: string) => {
      const file =
        _ === 'parent directory import'
          ? path.join(process.cwd(), 'src/nested/app.ts')
          : defaultTestFile;

      expect(rewriteImports(input, { file })).toBe(expected);
    },
  );

  it.each([
    [
      'named import',
      "import { module } from '#src/imported-module.js';",
      "import { module } from '#src/imported-module';",
    ],
    [
      'side-effect import',
      'import "#src/register.js";',
      'import "#src/register";',
    ],
    [
      're-export',
      "export { module } from '#src/imported-module.js';",
      "export { module } from '#src/imported-module';",
    ],
    [
      'dynamic import',
      "const module = await import('#src/imported-module.js');",
      "const module = await import('#src/imported-module');",
    ],
    [
      'module mock',
      "vi.mock('#src/imported-module.js');",
      "vi.mock('#src/imported-module');",
    ],
  ])(
    'should rewrite a #src %s without an extension',
    (_: string, input: string, expected: string) => {
      expect(rewriteImports(input)).toBe(expected);
    },
  );

  it.each([
    ['plain string', "const filePath = './imported-module.js';"],
    ['object property', "const config = { entry: './imported-module.js' };"],
    [
      'function argument',
      "await fs.promises.readFile('./imported-module.js');",
    ],
    ['glob pattern', "const files = await fg(['./**/*.js']);"],
    ['package import', "import { module } from 'my-package/module.js';"],
    ['extensionless #src import', "import { module } from '#src/module';"],
    ['already migrated relative import', "import { m } from './module.ts';"],
    ['json import', "import data from './data.json';"],
  ])('should not rewrite a %s', (_: string, input: string) => {
    expect(rewriteImports(input)).toBe(input);
  });

  it('should rewrite relative and #src imports in the same file', () => {
    const input = `import { a } from './a.js';
import { b } from '#src/b.js';
import { c } from 'c/c.js';

const d = './d.js';
`;

    expect(rewriteImports(input)).toBe(`import { a } from './a.ts';
import { b } from '#src/b';
import { c } from 'c/c.js';

const d = './d.js';
`);
  });
});

describe('tryRewriteRelativePathExtensions', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('pnpm'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no ts files are found', async () => {
      await expect(
        tryRewriteRelativePathExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no .ts or test.ts files found',
      } satisfies PatchReturnType);
    });

    it('should skip if no imports need rewriting', async () => {
      const inputVolume = {
        'src/app.ts': "import { module } from '#src/module';",
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteRelativePathExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no import path changes required',
      } satisfies PatchReturnType);

      expect(volToJson()).toEqual(inputVolume);
    });

    it('should rewrite relative and #src imports', async () => {
      const inputVolume = {
        'src/app.ts':
          "import { a } from './a.js';\nimport { b } from '#src/b.js';",
        'src/a.ts': 'export const a = 1;',
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteRelativePathExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
            'src/a.ts': 'export const a = 1;',
            'src/app.ts':
              "import { a } from './a.ts';\nimport { b } from '#src/b';",
          },
      );
    });
  });
});

describe('updatePackageJsonImports', () => {
  it('should update the #src subpath import conditions', () => {
    const parsed: PackageJson = {
      imports: {
        '#src/*': {
          '@seek/my-repo/source': './src/*',
          default: './lib/*',
        },
      },
    };

    expect(updateSrcSubpathImportsMapping(parsed)).toBe(true);
    expect(parsed.imports).toEqual({
      '#src/*': {
        '@seek/my-repo/source/*': './src/*.ts',
        default: './lib/*.js',
      },
    });
  });

  it('should leave already migrated conditions alone', () => {
    const parsed: PackageJson = {
      imports: {
        '#src/*': {
          '@seek/my-repo/source/*': './src/*.ts',
          default: './lib/*.js',
        },
      },
    };

    expect(updateSrcSubpathImportsMapping(parsed)).toBe(false);
  });

  it('should add a #src/*.json subpath import mapping', () => {
    const parsed: PackageJson = {
      imports: {
        '#src/*': {
          '@seek/my-repo/source': './src/*',
          default: './lib/*',
        },
      },
    };

    expect(addSrcJsonSubpathImportsMapping(parsed)).toBe(true);
    expect(parsed.imports).toMatchObject({
      '#src/*.json': {
        '@seek/my-repo/source': './src/*.json',
        default: './lib/*.json',
      },
    });
  });

  it('should derive #src/*.json mappings from migrated #src/* conditions', () => {
    const parsed: PackageJson = {
      imports: {
        '#src/*': {
          '@seek/my-repo/source/*': './src/*.ts',
          default: './lib/*.js',
        },
        '#src/*.json': {
          '@seek/my-repo/source': './src/*.json',
          default: './lib/*.json',
        },
      },
    };

    expect(addSrcJsonSubpathImportsMapping(parsed)).toBe(false);
  });
});

describe('tryAddPackageJsonJsonImports', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('pnpm'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no package.json files are found', async () => {
      await expect(
        tryAddPackageJsonJsonImports({ ...baseArgs, mode }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no package.json files found',
      } satisfies PatchReturnType);
    });

    it('should add #src/*.json subpath imports', async () => {
      const inputVolume = {
        'package.json': JSON.stringify(
          {
            imports: {
              '#src/*': {
                '@seek/my-repo/source/*': './src/*.ts',
                default: './lib/*.js',
              },
            },
          },
          null,
          2,
        ),
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryAddPackageJsonJsonImports({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
            'package.json': `{
  "imports": {
    "#src/*": {
      "@seek/my-repo/source/*": "./src/*.ts",
      "default": "./lib/*.js"
    },
    "#src/*.json": {
      "@seek/my-repo/source": "./src/*.json",
      "default": "./lib/*.json"
    }
  }
}
`,
          },
      );
    });
  });
});

describe('tryUpdatePackageJsonImports', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('pnpm'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no package.json files are found', async () => {
      await expect(
        tryUpdatePackageJsonImports({ ...baseArgs, mode }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no package.json files found',
      } satisfies PatchReturnType);
    });

    it('should update #src subpath imports', async () => {
      const inputVolume = {
        'package.json': JSON.stringify(
          {
            imports: {
              '#src/*': {
                '@seek/my-repo/source': './src/*',
                default: './lib/*',
              },
            },
          },
          null,
          2,
        ),
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryUpdatePackageJsonImports({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
            'package.json': `{
  "imports": {
    "#src/*": {
      "@seek/my-repo/source/*": "./src/*.ts",
      "default": "./lib/*.js"
    }
  }
}
`,
          },
      );
    });
  });
});
