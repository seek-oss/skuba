import tsParser from '@typescript-eslint/parser';

import config from 'eslint-config-skuba';

export default [
  {
    ignores: [
      'integration/base/',
      'integration/format/',
      'template/',
      'packages/**/*/lib*/',
    ],
  },
  ...config,
  {
    rules: {
      'no-process-exit': 'off',
    },
  },
  {
    files: ['integration/**/*.{ts,cts,mts,tsx}'],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        allowAutomaticSingleRunInference: false,
      },
    },
  },
  {
    files: ['packages/eslint-config-skuba/**/*.{ts,cts,mts,tsx}'],

    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: [
      'packages/eslint-config-skuba/requireExtensions.test.ts',
      'packages/eslint-config-skuba/src/requireExtensions.test.ts',
    ],

    rules: {
      'require-extensions/require-extensions': 'off',
      'require-extensions/require-index': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,cts,mts,tsx}'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'fs',
              message:
                'Prefer fs-extra as it implements graceful-fs behaviour.',
            },
            {
              name: 'fs/promises',
              message:
                'Prefer fs-extra as it implements graceful-fs behaviour.',
            },
          ],
        },
      ],
    },
  },
];
