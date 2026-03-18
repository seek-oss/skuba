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
            {
              name: 'fast-glob',
              allowImportNames: ['default'],
              message: "Please use import 'fg' from 'fast-glob' instead",
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'fs',
          property: 'readFile',
          message: 'Please use fs.promises.readFile instead.',
        },
        {
          object: 'fs',
          property: 'writeFile',
          message: 'Please use fs.promises.writeFile instead.',
        },
        {
          object: 'fs',
          property: 'readdir',
          message: 'Please use fs.promises.readdir instead.',
        },
      ],
    },
  },
];
