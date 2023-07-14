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
  ],
  rules: {
    // internal to skuba itself
    'no-process-exit': 'off',
  },
};
