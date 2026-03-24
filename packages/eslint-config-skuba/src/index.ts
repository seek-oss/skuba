import { defineConfig } from 'eslint/config';
import {
  js as jsExtensions,
  ts as tsExtensions,
} from 'eslint-config-seek/extensions';
import base from 'eslint-config-seek/vitest/base';
import skubaPlugin from 'eslint-plugin-skuba';
import eslintPluginYml from 'eslint-plugin-yml';
import tseslint from 'typescript-eslint';

const skuba = defineConfig([
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
      '**/coverage*/',
      '**/dist*/',
      '**/lib*/',
      '**/tmp*/',
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

      'vitest/expect-expect': 'off',
      // 'vitest/no-deprecated-functions': 'error',
      'vitest/prefer-expect-resolves': 'error',
      'vitest/prefer-spy-on': 'error',
      'vitest/prefer-strict-equal': 'off',
      'vitest/prefer-to-be': 'error',
      'vitest/prefer-to-contain': 'error',
      'vitest/prefer-to-have-length': 'error',
      'vitest/prefer-todo': 'error',
      'vitest/valid-title': 'error',
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
  ].map((config) => ({
    ...config,
    files: [`**/*.{${tsExtensions.join(',')}}`],
  })),
  ...skubaPlugin.configs.recommended.map((config) => ({
    ...config,
    files: [`**/*.{${tsExtensions.join(',')}}`],
  })),
  {
    name: 'skuba/typescript',
    files: [`**/*.{${tsExtensions.join(',')}}`],

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
    files: [`**/*.{${jsExtensions.join(',')}}`],

    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    name: 'skuba/typescript-tests',
    files: [
      `**/*.test.{${tsExtensions.join(',')}}`,
      `**/testing/**/*.{${tsExtensions.join(',')}}`,
    ],

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

      'skuba/no-sync-in-promise-iterable': 'off',

      // Allow type imports for vi.importActual
      // https://github.com/vitest-dev/vitest/blob/1a290f80912f8aa492ddc056b5e85bfad0a4193a/packages/vitest/src/integrations/vi.ts#L245
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: false,
        },
      ],
    },
  },
  ...eslintPluginYml.configs['flat/prettier'].map((config) => ({
    ...config,
    files: ['**/*.{yaml,yml}'],
  })),
]);

export default skuba;
