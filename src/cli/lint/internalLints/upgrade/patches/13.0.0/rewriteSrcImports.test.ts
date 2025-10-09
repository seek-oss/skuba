import memfs, { vol } from 'memfs';
import dedent from 'ts-dedent';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import {
  hasImportRegex,
  hasJestMockRegex,
  hasRelativeRegisterImportRegex,
  hasSkubaDiveRegisterImportRegex,
  hasSrcImportRegex,
  isFileEmpty,
  replaceSrcImport,
  tryRewriteSrcImports,
} from './rewriteSrcImports.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

beforeEach(() => vol.reset());

describe('tryRewriteSrcImports', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('yarn'),
  };

  afterEach(() => jest.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no ts test files are found', async () => {
      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no .ts or test.ts files found',
      });

      expect(volToJson()).toEqual({});
    });

    it('should patch a detected skuba-dive/register and src alias', async () => {
      const input = `import "skuba-dive/register";\nimport { getAccountInfo } from 'src/services/accounts/getAccountInfo.js;'`;

      const inputVolume = {
        'apps/api/app.ts': input,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'apps/api/app.ts': `import { getAccountInfo } from '#src/services/accounts/getAccountInfo.js;'`,
            },
      );
    });

    it('should delete file if it only contains skuba-dive/register import', async () => {
      const input = `import "skuba-dive/register";`;

      const inputVolume = {
        'apps/api/register.ts': input,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'apps/api': null,
            },
      );
    });

    it('should delete file if it only contains whitespace and comments after processing', async () => {
      const input = dedent`
        import "skuba-dive/register";
        // This is a comment
        /* Multi-line
           comment */

      `;

      const inputVolume = {
        'apps/api/empty-after-processing.ts': input,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'apps/api': null,
            },
      );
    });

    it('should not delete file if it contains meaningful content after processing', async () => {
      const input = dedent`
        import "skuba-dive/register";
        import { getAccountInfo } from 'src/services/accounts/getAccountInfo.js';

        export const someFunction = () => {
          return 'meaningful content';
        };
      `;

      const inputVolume = {
        'apps/api/meaningful-content.ts': input,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'apps/api/meaningful-content.ts': dedent`
                import { getAccountInfo } from '#src/services/accounts/getAccountInfo.js';

                export const someFunction = () => {
                  return 'meaningful content';
                };
              `,
            },
      );
    });

    it('should handle relative register imports correctly when target file will be deleted', async () => {
      const inputVolume = {
        'src/register.ts': `import "skuba-dive/register";`,
        'src/app.ts': dedent`
          import "./register";
          import { getAccountInfo } from 'src/services/accounts/getAccountInfo.js';

          export const someFunction = () => {
            return 'meaningful content';
          };
        `,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'src/app.ts': dedent`
                import { getAccountInfo } from '#src/services/accounts/getAccountInfo.js';

                export const someFunction = () => {
                  return 'meaningful content';
                };
              `,
            },
      );
    });

    it('should keep relative register imports when target file will not be deleted', async () => {
      const inputVolume = {
        'src/register.ts': dedent`
          import "skuba-dive/register";
          export const config = { test: true };
        `,
        'src/app.ts': dedent`
          import "./register";
          import { getAccountInfo } from 'src/services/accounts/getAccountInfo.js';

          export const someFunction = () => {
            return 'meaningful content';
          };
        `,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'src/register.ts': `export const config = { test: true };`,
              'src/app.ts': dedent`
                import "./register";
                import { getAccountInfo } from '#src/services/accounts/getAccountInfo.js';

                export const someFunction = () => {
                  return 'meaningful content';
                };
              `,
            },
      );
    });

    it('should handle nested relative register imports correctly', async () => {
      const inputVolume = {
        'src/register.ts': `import "skuba-dive/register";`,
        'src/nested/app.ts': dedent`
          import "../register";
          import { getAccountInfo } from 'src/services/accounts/getAccountInfo.js';

          export const someFunction = () => {
            return 'meaningful content';
          };
        `,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'src/nested/app.ts': dedent`
                import { getAccountInfo } from '#src/services/accounts/getAccountInfo.js';

                export const someFunction = () => {
                  return 'meaningful content';
                };
              `,
            },
      );
    });

    it('should handle mixed scenarios with some files being deleted and others not', async () => {
      const inputVolume = {
        'src/register.ts': `import "skuba-dive/register";`,
        'src/config.ts': dedent`
          import "skuba-dive/register";
          export const config = { test: true };
        `,
        'src/app.ts': dedent`
          import "./register";
          import "./config";
          import { getAccountInfo } from 'src/services/accounts/getAccountInfo.js';

          export const someFunction = () => {
            return 'meaningful content';
          };
        `,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteSrcImports({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'src/config.ts': `export const config = { test: true };`,
              'src/app.ts': dedent`
                import "./config";
                import { getAccountInfo } from '#src/services/accounts/getAccountInfo.js';

                export const someFunction = () => {
                  return 'meaningful content';
                };
              `,
            },
      );
    });
  });
});

describe('isFileEmpty', () => {
  it.each([
    ['Empty string', ''],
    ['Only whitespace', '   \n\t  \r\n  '],
    ['Only single-line comment', '// This is a comment'],
    ['Only multi-line comment', '/* This is a comment */'],
    [
      'Mixed whitespace and comments',
      '  \n// Comment\n  /* Another comment */  \n',
    ],
    [
      'Multiple single-line comments',
      '// Comment 1\n// Comment 2\n// Comment 3',
    ],
    ['Multiple multi-line comments', '/* Comment 1 */ /* Comment 2 */'],
    [
      'Complex whitespace and comments',
      `
        // Header comment
        
        /* 
         * Multi-line comment
         * with multiple lines
         */
        // Footer comment
        
      `,
    ],
  ])('should return true for %s', (_, input: string) => {
    expect(isFileEmpty(input)).toBe(true);
  });

  it.each([
    ['Simple code', 'const x = 1;'],
    ['Import statement', "import { test } from 'test';"],
    ['Export statement', 'export const test = 1;'],
    ['Function declaration', 'function test() {}'],
    ['Class declaration', 'class Test {}'],
    ['Type declaration', 'type Test = string;'],
    ['Interface declaration', 'interface Test {}'],
    ['Code with comments', 'const x = 1; // Comment'],
    ['Code with multi-line comment', 'const x = 1; /* Comment */'],
    [
      'Mixed code and comments',
      '// Comment\nconst x = 1;\n/* Another comment */',
    ],
    ['String containing comment-like text', "const str = '// not a comment';"],
    [
      'Template literal with comment-like text',
      'const str = `/* not a comment */`;',
    ],
  ])('should return false for %s', (_, input: string) => {
    expect(isFileEmpty(input)).toBe(false);
  });
});

describe('hasSkubaDiveRegisterImportRegex', () => {
  it.each([
    ['Bare import', 'import "skuba-dive/register";'],
    ['Bare import with .js', 'import "skuba-dive/register.js";'],
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasSkubaDiveRegisterImportRegex);
  });

  it.each([
    ['No register', 'import "'],
    ['Other import', 'import "source-map-support/register";'],
    ['Root import', 'import "./register";'],
    ['Root import with .js', 'import "./register.js";'],
    ['Relative import', 'import "../register";'],
    ['Relative import with .js', 'import "../register.js";'],
    ['Relative import with src', 'import "../src/register";'],
    ['Relative import with src and .js', 'import "../src/register.js";'],
    ['Nested import', 'import "../../src/register";'],
    ['Nested import with .js', 'import "../../src/register.js";'],
    [
      'Other lib namespace import',
      'import * as map from "source-map-support/register";',
    ],
    [
      'Other lib named import',
      'import { Register } from "source-map-support/register";',
    ],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasSkubaDiveRegisterImportRegex);
  });
});

describe('hasRelativeRegisterImportRegex', () => {
  it.each([
    ['Root import', 'import "./register";'],
    ['Root import with .js', 'import "./register.js";'],
    ['Relative import', 'import "../register";'],
    ['Relative import with .js', 'import "../register.js";'],
    ['Relative import with src', 'import "../src/register";'],
    ['Relative import with src and .js', 'import "../src/register.js";'],
    ['Nested import', 'import "../../src/register";'],
    ['Nested import with .js', 'import "../../src/register.js";'],
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasRelativeRegisterImportRegex);
  });

  it.each([
    ['No register', 'import "'],
    ['Bare skuba-dive import', 'import "skuba-dive/register";'],
    ['Bare skuba-dive import with .js', 'import "skuba-dive/register.js";'],
    ['Other import', 'import "source-map-support/register";'],
    ['Absolute import', 'import "src/register";'],
    [
      'Other lib namespace import',
      'import * as map from "source-map-support/register";',
    ],
    [
      'Other lib named import',
      'import { Register } from "source-map-support/register";',
    ],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasRelativeRegisterImportRegex);
  });
});

describe('hasSrcImportRegex and replaceSrcImport', () => {
  it.each([
    [
      'Named import with single quotes',
      "import { getAccountInfo, getCooked } from 'src/services/accounts/getAccountInfo.js';",
      "import { getAccountInfo, getCooked } from '#src/services/accounts/getAccountInfo.js';",
    ],
    [
      'Namespace import',
      "import * as s2s from 'src/framework/http.js';",
      "import * as s2s from '#src/framework/http.js';",
    ],
    [
      'Default import',
      "import logger from 'src/utils/logger.js';",
      "import logger from '#src/utils/logger.js';",
    ],
    [
      'types import',
      "import type { User } from 'src/types/user.js';",
      "import type { User } from '#src/types/user.js';",
    ],
    [
      'Multi-line types import',
      `import type {
        ZodOpenApiOperationObject,
        ZodOpenApiResponseObject,
      } from 'src/zod-openapi';`,
      `import type {
        ZodOpenApiOperationObject,
        ZodOpenApiResponseObject,
      } from '#src/zod-openapi';`,
    ],
    [
      'Mixed named and namespace imports',
      "import defaultExport, { namedExport } from 'src/utils/helpers.js';",
      "import defaultExport, { namedExport } from '#src/utils/helpers.js';",
    ],
    [
      'Mixed named and type imports',
      "import { type PrettierOutput, runPrettier } from 'src/adapter/prettier.js';",
      "import { type PrettierOutput, runPrettier } from '#src/adapter/prettier.js';",
    ],
    [
      'Multi-line import',
      `import {
        getAccountInfo,
        getCooked,
      } from 'src/services/accounts/getAccountInfo.js';`,
      `import {
        getAccountInfo,
        getCooked,
      } from '#src/services/accounts/getAccountInfo.js';`,
    ],
  ])('should replace %s', (_, input: string, expected: string) => {
    expect(replaceSrcImport(input)).toBe(expected);
  });

  it.each([
    ['no import', '"include": "apps/worker/src/**/*.ts",'],
    [
      'Other lib named import',
      'import { Register } from "source-map-support/register.js";',
    ],
    [
      'No src in the import',
      "import { mapDefaultSettings } from './mappers/mapDefaultSettings.js';",
    ],
    [
      'src in the middle of the import',
      "import './apps/api/src/testing/hooks.js';",
    ],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasSrcImportRegex);
  });
});

describe('hasImportRegex', () => {
  it.each([
    ['Basic dynamic import', "import('src/utils/helper.js')"],
    ['Dynamic import with spaces', "import( 'src/utils/helper.js' )"],
    ['Dynamic import with double quotes', 'import("src/utils/helper.js")'],
    [
      'Dynamic import with spaces and double quotes',
      'import( "src/utils/helper.js" )',
    ],
    ['Dynamic import without extension', "import('src/utils/helper')"],
    ['Dynamic import with extra spaces', "import(  'src/utils/helper.js'  )"],
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasImportRegex);
  });

  it.each([
    [
      'Regular import statement',
      "import { helper } from 'src/utils/helper.js'",
    ],
    ['Dynamic import without src prefix', "import('utils/helper.js')"],
    ['Dynamic import with different prefix', "import('lib/utils/helper.js')"],
    ['Dynamic import with src in middle', "import('utils/src/helper.js')"],
    ['String containing src but not import', "'src/utils/helper.js'"],
    ['Import with src in quotes but not path', "import('other-src/helper.js')"],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasImportRegex);
  });
});

describe('hasJestMockRegex', () => {
  it.each([
    ['Basic jest.mock', "jest.mock('src/utils/helper.js')"],
    ['Jest mock with spaces', "jest.mock( 'src/utils/helper.js' )"],
    ['Jest mock with double quotes', 'jest.mock("src/utils/helper.js")'],
    [
      'Jest mock with spaces and double quotes',
      'jest.mock( "src/utils/helper.js" )',
    ],
    ['Jest mock without extension', "jest.mock('src/utils/helper')"],
    ['Jest mock with extra spaces', "jest.mock(  'src/utils/helper.js'  )"],
    ['Jest mock with callback', "jest.mock('src/config', () => ({"],
    [
      'Jest mock with factory function',
      "jest.mock('src/utils/helper.js', () => jest.fn())",
    ],
    ['Basic jest.doMock', "jest.doMock('src/utils/helper.js')"],
    ['Jest doMock with double quotes', 'jest.doMock("src/utils/helper.js")'],
    ['Jest doMock without extension', "jest.doMock('src/utils/helper')"],
    ['Jest doMock with callback', "jest.doMock('src/config', () => ({"],
    [
      'Jest doMock with factory function',
      "jest.doMock('src/utils/helper.js', () => jest.fn())",
    ],
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasJestMockRegex);
  });

  it.each([
    ['Jest mock without src prefix', "jest.mock('utils/helper.js')"],
    ['Jest mock with different prefix', "jest.mock('lib/utils/helper.js')"],
    ['Jest mock with src in middle', "jest.mock('utils/src/helper.js')"],
    ['String containing src but not jest.mock', "'src/utils/helper.js'"],
    [
      'Jest mock with src in quotes but not path',
      "jest.mock('other-src/helper.js')",
    ],
    ['Other jest method', "jest.fn('src/utils/helper.js')"],
    ['Mock without jest prefix', "mock('src/utils/helper.js')"],
    ['Jest doMock without src prefix', "jest.doMock('utils/helper.js')"],
    ['Jest doMock with src in middle', "jest.doMock('utils/src/helper.js')"],
    ['doMock without jest prefix', "doMock('src/utils/helper.js')"],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasJestMockRegex);
  });
});
