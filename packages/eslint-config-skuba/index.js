const base = require('eslint-config-seek/base');
const extensions = require('eslint-config-seek/extensions');
const requireExtensions = require('eslint-plugin-require-extensions');
const eslintPluginYml = require('eslint-plugin-yml');
const tseslint = require('typescript-eslint');

const { js: jsExtensions, ts: tsExtensions } = extensions;

module.exports = [
  {
    name: 'skuba/pre-esm',
    plugins: {
      'require-extensions': requireExtensions,
    },
    rules: {
      'require-extensions/require-extensions': 'error',
      'require-extensions/require-index': 'error',
    },
  },
  {
    name: 'skuba/ignores',
    ignores: [
      // Gantry resource files support non-standard syntax (Go templating)
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
  ...base,
  {
    name: 'skuba/javascript',
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

      // https://github.com/prettier/eslint-config-prettier/blob/v8.5.0/README.md#quotes
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
  ...[
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ].map(({ plugins, ...config }) => ({
    ...config,
    files: [`**/*.{${tsExtensions}}`],
  })),
  {
    name: 'skuba/typescript',
    files: [`**/*.{${tsExtensions}}`],

    rules: {
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      // allow || on strings and booleans
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: {
            string: true,
            boolean: true,
          },
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
    files: [`**/*.{${jsExtensions}}`],

    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    name: 'skuba/typescript-tests',
    files: [`**/*.test.{${tsExtensions}}`, `**/testing/**/*.{${tsExtensions}}`],

    rules: {
      // Allow `any` in tests
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow e.g. `String(unknown)`
      '@typescript-eslint/no-base-to-string': 'off',

      // Allow ! in tests
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Allow e.g. `expect(logger.child).toBeCalledWith()`
      '@typescript-eslint/unbound-method': 'off',

      // Allow backtick default in `expect().toMatchInlineSnapshot()`
      quotes: 'off',

      // Allow e.g. `/** @jest-environment jsdom */` directives
      'tsdoc/syntax': 'off',

      // Allow edge-case error handling tests, including from skuba's templates
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',

      // Allow potential floating promises in tests only for Koa compatibility
      // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/no-misused-promises.md#checksvoidreturn
      // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/42551#issuecomment-648816869
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
    },
  },
  ...eslintPluginYml.configs['flat/prettier'].map((config) => ({
    ...config,
    files: ['**/*.{yaml,yml}'],
  })),
];
