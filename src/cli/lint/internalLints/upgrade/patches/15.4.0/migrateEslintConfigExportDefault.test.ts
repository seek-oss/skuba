import path from 'path';

import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import { tryMigrateEslintConfigExportDefault } from './migrateEslintConfigExportDefault.js';

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

describe('tryMigrateEslintConfigExportDefault', () => {
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
      it('should skip if no config files with module.exports or require found', async () => {
        vol.fromJSON({ 'package.json': '{}' });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no config files with module.exports or require found',
        });

        expect(volToJson()).toEqual({ 'package.json': '{}' });
      });

      it('should convert module.exports = require to export { default } from (with type:module)', async () => {
        const input = "module.exports = require('eslint-config-skuba');";

        const expected = "export { default } from 'eslint-config-skuba';\n";

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{"type":"module"}', 'eslint.config.js': input }
            : {
                'package.json': '{"type":"module"}',
                'eslint.config.js': expected,
              },
        );
      });

      it('should not rename .js to .mjs when package lacks type:module', async () => {
        const input = "module.exports = require('eslint-config-skuba');";

        const expected = "export { default } from 'eslint-config-skuba';\n";

        vol.fromJSON({
          'package.json': '{}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{}', 'eslint.config.js': input }
            : { 'package.json': '{}', 'eslint.config.js': expected },
        );
      });

      it('should resolve directory import in module.exports = require', async () => {
        const input = "module.exports = require('.');";

        const expected = "export { default } from './index.js';\n";

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{"type":"module"}', 'eslint.config.js': input }
            : {
                'package.json': '{"type":"module"}',
                'eslint.config.js': expected,
              },
        );
      });

      it('should convert export default require to export { default } from', async () => {
        const input = "export default require('.');";
        const expected = "export { default } from './index.js';\n";

        vol.fromJSON({
          'package.json': '{}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{}', 'eslint.config.js': input }
            : { 'package.json': '{}', 'eslint.config.js': expected },
        );
      });

      it('should convert const x = require to import x from', async () => {
        const input = `const config = require('eslint-config-skuba');
module.exports = [...config, { rules: { 'no-process-exit': 'off' } }];
`;

        const expected = `import config from 'eslint-config-skuba';

export default [...config, { rules: { 'no-process-exit': 'off' } }];
`;

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{"type":"module"}', 'eslint.config.js': input }
            : {
                'package.json': '{"type":"module"}',
                'eslint.config.js': expected,
              },
        );
      });

      it('should convert destructuring require to import', async () => {
        const input = `const { foo, bar } = require('some-package');
module.exports = { foo, bar };
`;

        const expected = `import { foo, bar } from 'some-package';

export default { foo, bar };
`;

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          'vitest.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{"type":"module"}', 'vitest.config.js': input }
            : {
                'package.json': '{"type":"module"}',
                'vitest.config.js': expected,
              },
        );
      });

      it('should migrate prettier.config.js (non-eslint config)', async () => {
        const input = `module.exports = {
  semi: true,
  singleQuote: true,
};
`;

        const expected = `export default {
  semi: true,
  singleQuote: true,
};
`;

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          'prettier.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? {
                'package.json': '{"type":"module"}',
                'prettier.config.js': input,
              }
            : {
                'package.json': '{"type":"module"}',
                'prettier.config.js': expected,
              },
        );
      });

      it('should convert .prettierrc.js module.exports = require to export { default } from', async () => {
        const input = "module.exports = require('skuba/config/prettier.js');";

        const expected =
          "export { default } from 'skuba/config/prettier.js';\n";

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          '.prettierrc.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? {
                'package.json': '{"type":"module"}',
                '.prettierrc.js': input,
              }
            : {
                'package.json': '{"type":"module"}',
                '.prettierrc.js': expected,
              },
        );
      });

      it('should add .js extension to subpath imports without extension in .prettierrc.js', async () => {
        const input = "module.exports = require('skuba/config/prettier');";

        const expected =
          "export { default } from 'skuba/config/prettier.js';\n";

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          '.prettierrc.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? {
                'package.json': '{"type":"module"}',
                '.prettierrc.js': input,
              }
            : {
                'package.json': '{"type":"module"}',
                '.prettierrc.js': expected,
              },
        );
      });

      it('should not add .js extension to scoped package without subpath', async () => {
        const input = "module.exports = require('@seek/eslint-config-skuba');";

        const expected =
          "export { default } from '@seek/eslint-config-skuba';\n";

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{"type":"module"}', 'eslint.config.js': input }
            : {
                'package.json': '{"type":"module"}',
                'eslint.config.js': expected,
              },
        );
      });

      it('should add .js extension to scoped package with subpath in .prettierrc.js', async () => {
        const input =
          "module.exports = require('@seek/skuba/config/prettier');";

        const expected =
          "export { default } from '@seek/skuba/config/prettier.js';\n";

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          '.prettierrc.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? {
                'package.json': '{"type":"module"}',
                '.prettierrc.js': input,
              }
            : {
                'package.json': '{"type":"module"}',
                '.prettierrc.js': expected,
              },
        );
      });

      it('should convert module.exports = [config] to export default (no require)', async () => {
        const input = `module.exports = [
  { rules: { 'no-console': 'off' } },
];
`;

        const expected = `export default [
  { rules: { 'no-console': 'off' } },
];
`;

        vol.fromJSON({
          'package.json': '{"type":"module"}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'apply',
        });

        expect(volToJson()).toEqual(
          mode === 'lint'
            ? { 'package.json': '{"type":"module"}', 'eslint.config.js': input }
            : {
                'package.json': '{"type":"module"}',
                'eslint.config.js': expected,
              },
        );
      });

      it('should skip if config files already use export default', async () => {
        const input = `import config from 'eslint-config-skuba';

export default [
  ...config,
  { rules: { 'no-process-exit': 'off' } },
];
`;

        vol.fromJSON({
          'package.json': '{}',
          'eslint.config.js': input,
        });

        await expect(
          tryMigrateEslintConfigExportDefault({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no config files with module.exports or require found',
        });

        expect(volToJson()).toEqual({
          'package.json': '{}',
          'eslint.config.js': input,
        });
      });
    },
  );
});
