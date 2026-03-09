import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import {
  hasDirNameRegex,
  hasDirNameVariableRegex,
  hasFileNameRegex,
  hasFileNameVariableRegex,
  tryRewriteGlobalVars,
} from './rewriteGlobalVars.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));
vi.mock('fast-glob', () => ({
  glob: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

beforeEach(() => vol.reset());

describe('tryRewriteGlobalVars', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('yarn'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no ts test files are found', async () => {
      await expect(
        tryRewriteGlobalVars({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no .ts or test.ts files found',
      });

      expect(volToJson()).toEqual({});
    });

    it('should patch a detected __dirname and __filename', async () => {
      const input = `const dirname = __dirname;\nconst filename = __filename;`;

      const inputVolume = {
        'apps/api/app.ts': input,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRewriteGlobalVars({
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
              'apps/api/app.ts': `const dirname = import.meta.dirname;\nconst filename = import.meta.filename;`,
            },
      );
    });
  });
});

describe('hasDirNameRegex', () => {
  it.each([
    ['__dirname', '__dirname'],
    [
      'path join',
      'const filepath = path.join(__dirname, "../data/backstage-domains.yaml");',
    ],
    [
      'sku config dirname',
      'const skuConfig = withNx("libs-shared", __dirname, {...})',
    ],
    ['config dirname', 'projectRoot: __dirname,'],
    ['embedded string', 'const to = `${__dirname}/api-schema-resolved.json`;'],
    ['vitest config mts', `'~': resolve(__dirname, 'src'),'`], // SEEK-Jobs/automat-deploy-robot · vitest.config.mts
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasDirNameRegex);
  });

  it.each([
    ['import meta dirname', 'import.meta.dirname'],
    ['local dirname variable', 'const dirname = import.meta.dirname;'],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasDirNameRegex);
  });
});

describe('hasFileNameRegex', () => {
  it.each([
    ['__filename', '__filename'],
    ['stand alone variable', 'delete require.cache[__filename];'],
    ['path resolve', 'const thisFile = path.resolve(__filename);'],
    [
      'embedded string',
      'Usage: ${basename(__filename)} <aws-secret-name> [aws-secret-key-name]',
    ],
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasFileNameRegex);
  });

  it.each([
    ['import meta filename', 'import.meta.filename'],
    ['local filename variable', 'const filename = import.meta.filename;'],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasFileNameRegex);
  });
});

describe('hasDirNameVariableRegex', () => {
  it('should match const __dirname =', () => {
    expect('const __dirname =').toMatch(hasDirNameVariableRegex);
  });
  it('should not match __dirname =', () => {
    expect('projectRoot: __dirname').not.toMatch(hasDirNameVariableRegex);
  });
});

describe('hasFileNameVariableRegex', () => {
  it('should match const __filename =', () => {
    expect('const __filename =').toMatch(hasFileNameVariableRegex);
  });
  it('should not match __filename =', () => {
    expect('projectRoot: __filename').not.toMatch(hasFileNameVariableRegex);
  });
});
