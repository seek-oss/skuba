import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryAddTsConfigImportExtensions } from './addTsConfigImportExtensions.js';

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

describe('tryAddTsConfigImportExtensions', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('pnpm'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no tsconfig.json files are found', async () => {
      await expect(
        tryAddTsConfigImportExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no tsconfig.json files found',
      } satisfies PatchReturnType);
    });

    it('should skip if both options are already set', async () => {
      const inputVolume = {
        'tsconfig.json': `{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true
  },
  "extends": "skuba/config/tsconfig.json"
}
`,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryAddTsConfigImportExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no tsconfig.json import extension changes required',
      } satisfies PatchReturnType);

      expect(volToJson()).toEqual(inputVolume);
    });

    it('should add both options while preserving comments', async () => {
      const inputVolume = {
        'tsconfig.json': `{
  "compilerOptions": {
    "outDir": "lib", // build output
    "target": "ES2024"
  },
  "extends": "skuba/config/tsconfig.json"
}
`,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryAddTsConfigImportExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'tsconfig.json': `{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "outDir": "lib", // build output
    "target": "ES2024"
  },
  "extends": "skuba/config/tsconfig.json"
}
`,
            },
      );
    });

    it('should add only the missing option', async () => {
      const inputVolume = {
        'tsconfig.json': `{
  "compilerOptions": {
    "rewriteRelativeImportExtensions": true
  }
}
`,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryAddTsConfigImportExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'tsconfig.json': `{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true
  }
}
`,
            },
      );
    });

    it('should add a compilerOptions object when it is absent', async () => {
      const inputVolume = {
        'tsconfig.json': `{
  "extends": "skuba/config/tsconfig.json"
}
`,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryAddTsConfigImportExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'tsconfig.json': `{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true
  },
  "extends": "skuba/config/tsconfig.json"
}
`,
            },
      );
    });

    it('should not leave a trailing comma in an empty compilerOptions object', async () => {
      const inputVolume = {
        'tsconfig.json': `{
  "compilerOptions": {}
}
`,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryAddTsConfigImportExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'tsconfig.json': `{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true}
}
`,
            },
      );
    });

    it('should patch nested tsconfig.json files', async () => {
      const inputVolume = {
        'tsconfig.json': `{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true
  }
}
`,
        'packages/api/tsconfig.json': `{
  "compilerOptions": {
    "rootDir": "."
  },
  "extends": "../../tsconfig.json"
}
`,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryAddTsConfigImportExtensions({ ...baseArgs, mode }),
      ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              ...inputVolume,
              'packages/api/tsconfig.json': `{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "rootDir": "."
  },
  "extends": "../../tsconfig.json"
}
`,
            },
      );
    });
  });
});
