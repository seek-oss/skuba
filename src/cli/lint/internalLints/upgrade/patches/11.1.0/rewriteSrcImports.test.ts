import memfs, { vol } from 'memfs';

import type { PatchConfig } from '../..';
import { configForPackageManager } from '../../../../../../utils/packageManager';

import {
  hasSkubaDiveRegisterImportRegex,
  hasSrcImportRegex,
  replaceSrcImport,
  tryRewriteSrcImports,
} from './rewriteSrcImports';

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
  });
});
describe('hasSkubaDiveRegisterImportRegex', () => {
  it.each([
    ['Bare import', 'import "skuba-dive/register";'],
    ['Bare import with .js', 'import "skuba-dive/register.js";'],
    ['Root import', 'import "./register";'],
    ['Root import with .js', 'import "./register.js";'],
    ['Relative import', 'import "../register";'],
    ['Relative import with .js', 'import "../register.js";'],
    ['Relative import with src', 'import "../src/register";'],
    ['Relative import with src and .js', 'import "../src/register.js";'],
    ['Nested import', 'import "../../src/register";'],
    ['Nested import with .js', 'import "../../src/register.js";'],
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasSkubaDiveRegisterImportRegex);
  });

  it.each([
    ['No register', 'import "'],
    ['Other import', 'import "source-map-support/register";'],
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
      'Mixed imports',
      "import defaultExport, { namedExport } from 'src/utils/helpers.js';",
      "import defaultExport, { namedExport } from '#src/utils/helpers.js';",
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
