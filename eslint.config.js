import tsParser from '@typescript-eslint/parser';

import skuba from 'eslint-config-skuba';

export default [
  {
    ignores: [
      'integration/base/',
      'integration/format/',
      'template/',
      'packages/**/*/lib*/',
    ],
  },
  ...skuba,
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
