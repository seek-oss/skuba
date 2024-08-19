const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const base = require('eslint-config-seek/base');
const extensions = require('eslint-config-seek/extensions');
const jestPlugin = require('eslint-plugin-jest');
const tsdoc = require('eslint-plugin-tsdoc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const { js: jsExtensions, ts: tsExtensions } = extensions;

module.exports = [
  { plugins: { jest: jestPlugin } },
  {
    ignores: [
      '**/.gantry/**/*.yaml',
      '**/.gantry/**/*.yml',
      '**/gantry*.yaml',
      '**/gantry*.yml',
      '.idea/*',
      '.vscode/*',
      '**/.cdk.staging/',
      '**/.pnpm-store/',
      '**/.serverless/',
      '**/cdk.out/',
      '**/node_modules*/',
      'coverage*/',
      'dist*/',
      'lib*/',
      'tmp*/',
    ],
  },
  ...base.map(({ plugins: { jest: _jest, ...restPlugins } = {}, ...conf }) => ({
    ...conf,
    plugins: restPlugins,
  })),
  {
    rules: {
      'import-x/no-duplicates': 'error',

      'import-x/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
          },

          'newlines-between': 'always',

          pathGroups: [
            {
              group: 'external',
              pattern: 'src',
              position: 'after',
            },
            {
              group: 'external',
              pattern: 'src/**',
              position: 'after',
            },
          ],

          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],

      'jest/expect-expect': 'off',
      'jest/no-deprecated-functions': 'error',
      'jest/prefer-expect-resolves': 'error',
      'jest/prefer-spy-on': 'error',
      'jest/prefer-strict-equal': 'off',
      'jest/prefer-to-be': 'error',
      'jest/prefer-to-contain': 'error',
      'jest/prefer-to-have-length': 'error',
      'jest/prefer-todo': 'error',
      'jest/valid-title': 'error',
      'no-use-before-define': 'off',

      quotes: [
        'warn',
        'single',
        {
          allowTemplateLiterals: false,
          avoidEscape: true,
        },
      ],

      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],
    },
  },
  ...compat
    .extends(
      'plugin:@typescript-eslint/recommended-type-checked',
      'plugin:@typescript-eslint/stylistic-type-checked',
    )
    .map((config) => ({
      ...config,
      files: [`**/*.{${tsExtensions}}`],
    })),
  {
    files: [`**/*.{${tsExtensions}}`],

    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        projectService: true,
      },
    },

    rules: {
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: {
            string: true,
            boolean: true,
          },
        },
      ],

      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',

      // Enabled with `unused-imports/` in `eslint-config-seek`
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: [`**/*.{${jsExtensions}}`],

    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'import-x/no-unresolved': 'off',
    },
  },
  {
    files: [`**/*.{${tsExtensions}}`],

    plugins: {
      tsdoc,
    },

    rules: {
      'tsdoc/syntax': 'error',
    },
  },
  {
    files: [`**/*.test.{${tsExtensions}}`, `**/testing/**/*.{${tsExtensions}}`],

    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      quotes: 'off',
      'tsdoc/syntax': 'off',

      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
    },
  },
  ...compat.extends('plugin:yml/prettier').map((config) => ({
    ...config,
    files: ['**/*.{yaml,yml}'],
  })),
];
