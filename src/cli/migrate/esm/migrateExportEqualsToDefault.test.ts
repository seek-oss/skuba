import path from 'path';

import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../utils/packageManager.js';
import type { PatchConfig } from '../../lint/internalLints/upgrade/index.js';

import { tryMigrateExportEqualsToDefault } from './migrateExportEqualsToDefault.js';

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

describe('tryMigrateExportEqualsToDefault', () => {
  const baseArgs = {
    manifest: {
      path: path.join(process.cwd(), 'package.json'),
      packageJson: {},
    } as PatchConfig['manifest'],
    packageManager: configForPackageManager('yarn'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip when no export = is present', async () => {
      vol.fromJSON({
        'package.json': '{}',
        'src/index.ts': 'export const x = 1;\n',
      });

      await expect(
        tryMigrateExportEqualsToDefault({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no export = assignments found to migrate',
      });

      expect(volToJson()).toEqual({
        'package.json': '{}',
        'src/index.ts': 'export const x = 1;\n',
      });
    });

    it('should migrate export = to export default', async () => {
      const input = "import foo from 'foo';\n\nexport = foo;\n";
      const expected = "import foo from 'foo';\n\nexport default foo;\n";

      vol.fromJSON({
        'package.json': '{}',
        'src/legacy.ts': input,
      });

      await expect(
        tryMigrateExportEqualsToDefault({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? {
              'package.json': '{}',
              'src/legacy.ts': input,
            }
          : {
              'package.json': '{}',
              'src/legacy.ts': expected,
            },
      );
    });

    it('should migrate export = with a function expression', async () => {
      const input = 'export = function bar() {\n  return 1;\n};\n';
      const expected = 'export default function bar() {\n  return 1;\n};\n';

      vol.fromJSON({
        'package.json': '{}',
        'src/fn.ts': input,
      });

      await expect(
        tryMigrateExportEqualsToDefault({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? {
              'package.json': '{}',
              'src/fn.ts': input,
            }
          : {
              'package.json': '{}',
              'src/fn.ts': expected,
            },
      );
    });
  });
});
