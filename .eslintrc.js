const { ts } = require('eslint-config-seek/extensions');

module.exports = {
  extends: ['skuba'],

  overrides: [
    {
      // TypeScript config
      files: [`**/*.{${ts}}`],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        allowAutomaticSingleRunInference: false,
      },
    },
  ],
  rules: {
    // internal to skuba itself
    'no-process-exit': 'off',
  },
};
