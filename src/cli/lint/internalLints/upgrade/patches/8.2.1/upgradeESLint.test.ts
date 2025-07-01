import memfs, { vol } from 'memfs';

import type { PatchConfig } from '../..';
import { configForPackageManager } from '../../../../../../utils/packageManager';

import { tryUpgradeESLint } from './upgradeESLint';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);

beforeEach(() => vol.reset());

describe('upgradeESLint', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('pnpm'),
  };

  afterEach(() => jest.resetAllMocks());

  describe('lint', () => {
    const args = { ...baseArgs, mode: 'lint' } as const;

    it('should skip if no .eslintrc.js file', async () => {
      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({
        result: 'skip',
        reason: 'no .eslintrc.js - have you already migrated?',
      });
    });

    it('should apply if .eslintrc.js file exists', async () => {
      vol.fromJSON({
        '.eslintrc.js': 'module.exports = { extends: ["skuba"] };',
      });

      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({ result: 'apply' });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          ".eslintrc.js": "module.exports = { extends: ["skuba"] };",
        }
      `);
    });
  });

  describe('format', () => {
    const args = { ...baseArgs, mode: 'format' } as const;

    it('should skip if no .eslintrc.js file', async () => {
      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({
        result: 'skip',
        reason: 'no .eslintrc.js - have you already migrated?',
      });
    });

    it('should perform a basic migration with no .eslintignore', async () => {
      vol.fromJSON({
        '.eslintrc.js': 'module.exports = { extends: ["skuba"] };',
      });

      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({ result: 'apply' });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "eslint.config.js": "const skuba = require('eslint-config-skuba');

        const { defineConfig } = require('eslint/config');

        module.exports = defineConfig([
          {
            extends: skuba,
          },
        ]);
        ",
        }
      `);
    });

    it('should perform a basic migration with .eslintignore without managed section', async () => {
      vol.fromJSON({
        '.eslintrc.js': 'module.exports = { extends: ["skuba"] };',
        '.eslintignore': 'a\nb\n!c',
      });

      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({ result: 'apply' });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "eslint.config.js": "const skuba = require('eslint-config-skuba');

        const { defineConfig, globalIgnores } = require('eslint/config');

        module.exports = defineConfig([
          {
            extends: skuba,
          },
          globalIgnores(['**/a', '**/b', '!**/c']),
        ]);
        ",
        }
      `);
    });

    it('should perform a basic migration with .eslintignore with managed section', async () => {
      vol.fromJSON({
        '.eslintrc.js': 'module.exports = { extends: ["skuba"] };',
        '.eslintignore':
          '# managed by skuba\nstuff that will be ignored\n# end managed by skuba\na\nb\n!c',
      });

      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({ result: 'apply' });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "eslint.config.js": "const skuba = require('eslint-config-skuba');

        const { defineConfig, globalIgnores } = require('eslint/config');

        module.exports = defineConfig([
          {
            extends: skuba,
          },
          globalIgnores(['**/a', '**/b', '!**/c']),
        ]);
        ",
        }
      `);
    });

    it('should perform a basic migration with .eslintignore that is only a managed section', async () => {
      vol.fromJSON({
        '.eslintrc.js': 'module.exports = { extends: ["skuba"] };',
        '.eslintignore':
          '\n\n# managed by skuba\nstuff that will be ignored\n# end managed by skuba\n',
      });

      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({ result: 'apply' });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "eslint.config.js": "const skuba = require('eslint-config-skuba');

        const { defineConfig } = require('eslint/config');

        module.exports = defineConfig([
          {
            extends: skuba,
          },
        ]);
        ",
        }
      `);
    });

    it('should perform a migration with overrides', async () => {
      vol.fromJSON({
        '.eslintignore': 'a',
        '.eslintrc.js': `module.exports = {
  extends: ["skuba"],
  overrides: [
    {
      files: ["cli/**/*.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
`,
      });

      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({ result: 'apply' });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "eslint.config.js": "const skuba = require('eslint-config-skuba');

        const { defineConfig, globalIgnores } = require('eslint/config');

        module.exports = defineConfig([
          {
            extends: skuba,
          },
          {
            files: ['cli/**/*.ts'],

            rules: {
              'no-console': 'off',
            },
          },
          globalIgnores(['**/a']),
        ]);
        ",
        }
      `);
    });

    it('should perform a complex migration', async () => {
      vol.fromJSON({
        '.eslintignore': 'a',
        '.eslintrc.js': `/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    node: true,
    es6: true,
  },
  plugins: ['jest-formatting'],
  extends: ['eslint-config-skuba', 'plugin:jest-formatting/recommended'],
  ignorePatterns: [
    'src/**/__mocks__*',
    'src/**/**/__mocks__*',
    'src/schema/generated/graphql.ts',
  ],
  overrides: [
    {
      files: ['scripts/**/*'],
      rules: {
        'no-console': 'off',
        'no-sync': 'off',
      },
    },
  ],
};`,
      });

      const result = await tryUpgradeESLint(args);
      expect(result).toEqual({ result: 'apply' });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "eslint.config.js": "const { defineConfig, globalIgnores } = require('eslint/config');

        const globals = require('globals');
        const jestFormatting = require('eslint-plugin-jest-formatting');
        const js = require('@eslint/js');

        const { FlatCompat } = require('@eslint/eslintrc');

        const compat = new FlatCompat({
          baseDirectory: __dirname,
          recommendedConfig: js.configs.recommended,
          allConfig: js.configs.all,
        });

        module.exports = defineConfig([
          {
            languageOptions: {
              globals: {
                ...globals.node,
              },
            },

            plugins: {
              'jest-formatting': jestFormatting,
            },

            extends: compat.extends(
              'eslint-config-skuba',
              'plugin:jest-formatting/recommended',
            ),
          },
          globalIgnores([
            'src/**/__mocks__*',
            'src/**/**/__mocks__*',
            'src/schema/generated/graphql.ts',
          ]),
          {
            files: ['scripts/**/*'],

            rules: {
              'no-console': 'off',
              'no-sync': 'off',
            },
          },
          globalIgnores(['**/a']),
        ]);
        ",
        }
      `);
    });
  });
});
