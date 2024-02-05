const { ts } = require('eslint-config-seek/extensions');

module.exports = {
  extends: ['skuba'],
  overrides: [
    {
      files: [`integration/**/*.{${ts}}`],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        // seek-oss/eslint-config-seek#124
        // typescript-eslint/typescript-eslint#3851
        allowAutomaticSingleRunInference: false,
      },
    },
    {
      files: [`src/**/*.{${ts}}`],
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
            ],
          },
        ],
      },
    },
  ],
  rules: {
    // internal to skuba itself
    'no-process-exit': 'off',
  },
};
