/** @type {{ js: string[], ts: string[] }} */
const extensions = require('eslint-config-seek/extensions');

const { js, ts } = extensions;

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['seek/base'],
  ignorePatterns: [
    '**/.eslintrc.js',

    // Gantry resource files support non-standard syntax (Go templating)
    '**/.gantry/**/*.yaml',
    '**/.gantry/**/*.yml',
    '**/gantry*.yaml',
    '**/gantry*.yml',
  ],
  overrides: [
    {
      extends: [
        'plugin:@typescript-eslint/recommended-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
      ],
      files: [`*.{${ts.join(',')}}`],
      parserOptions: {
        project: true,
      },
      rules: {
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        // allow || on strings and booleans
        '@typescript-eslint/prefer-nullish-coalescing': [
          'error',
          {
            ignorePrimitives: { string: true, boolean: true },
          },
        ],
        // prefer type assertions over null assertions
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/non-nullable-type-assertion-style': 'off',

        // too spicy 🌶️
        '@typescript-eslint/consistent-type-definitions': 'off',
      },
    },
    {
      files: [`*.{${js.join(',')}}`],
      rules: {
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'import/no-unresolved': 'off',
      },
    },
    {
      files: [`*.{${ts.join(',')}}`],
      plugins: ['eslint-plugin-tsdoc'],
      rules: {
        'tsdoc/syntax': 'error',
      },
    },
    {
      files: [`*.test.{${ts.join(',')}}`, `**/testing/**/*.{${ts.join(',')}}`],
      rules: {
        // Allow `any` in tests
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-explicit-any': 'off',

        // Allow ! in tests
        '@typescript-eslint/no-non-null-assertion': 'off',

        // Allow e.g. `expect(logger.child).toBeCalledWith()`
        '@typescript-eslint/unbound-method': 'off',

        // Allow backtick default in `expect().toMatchInlineSnapshot()`
        quotes: 'off',

        // Allow e.g. `/** @jest-environment jsdom */` directives
        'tsdoc/syntax': 'off',

        // Allow potential floating promises in tests only for Koa compatibility
        // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/no-misused-promises.md#checksvoidreturn
        // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/42551#issuecomment-648816869
        '@typescript-eslint/no-misused-promises': [
          'error',
          { checksVoidReturn: false },
        ],
      },
    },
    {
      extends: ['plugin:yml/prettier'],
      files: ['*.{yaml,yml}'],
    },
  ],
  rules: {
    'import/no-duplicates': 'error',
    'import/order': [
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

    // https://github.com/prettier/eslint-config-prettier/blob/v8.5.0/README.md#quotes
    quotes: [
      'warn',
      'single',
      { allowTemplateLiterals: false, avoidEscape: true },
    ],

    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true,
      },
    ],
  },
};
