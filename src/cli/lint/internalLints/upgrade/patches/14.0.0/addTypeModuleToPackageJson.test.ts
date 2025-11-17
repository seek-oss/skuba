import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import { tryAddTypeModuleToPackageJson } from './addTypeModuleToPackageJson.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const input = `{ "name": "test", "version": "1.0.0", "dependencies": { "lodash": "4.17.21" } }`;
const resultWithTypeModule =
  '{\n  "name": "test",\n  "version": "1.0.0",\n  "type": "module",\n  "dependencies": {\n    "lodash": "4.17.21"\n  }\n}\n';

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
vi.mock('read-package-up', () => ({
  readPackageUp: async () => {
    const packageJsonPath = `package.json`;
    const packageJsonContent = await memfs.fs.promises.readFile(
      packageJsonPath,
      'utf-8',
    );
    return {
      packageJson: JSON.parse(packageJsonContent as string),
      path: packageJsonPath,
    };
  },
}));

beforeEach(() => {
  vol.reset();
});

describe('tryAddTypeModuleToPackageJson', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('yarn'),
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no package.json files are found', async () => {
      await expect(
        tryAddTypeModuleToPackageJson({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no package.json file found',
      });

      expect(volToJson()).toEqual({});
    });

    it('should add type module to the root package json file if not present', async () => {
      vol.fromJSON({ 'package.json': input });

      await expect(
        tryAddTypeModuleToPackageJson({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? { 'package.json': input }
          : { 'package.json': resultWithTypeModule },
      );
    });

    it('should skip if type module is already present', async () => {
      const inputWithTypeModule = `{ "name": "test", "version": "1.0.0", "type": "module", "dependencies": { "lodash": "4.17.21" } }`;
      vol.fromJSON({ 'package.json': inputWithTypeModule });

      await expect(
        tryAddTypeModuleToPackageJson({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'type module already present in package.json',
      });

      expect(volToJson()).toEqual({ 'package.json': inputWithTypeModule });
    });

    it(' should add type module to all package json files if not present', async () => {
      vol.fromJSON({
        'package.json': input,
        'sub-package/package.json': input,
      });

      await expect(
        tryAddTypeModuleToPackageJson({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? {
              'package.json': input,
              'sub-package/package.json': input,
            }
          : {
              'package.json': resultWithTypeModule,
              'sub-package/package.json': resultWithTypeModule,
            },
      );
    });
  });
});
