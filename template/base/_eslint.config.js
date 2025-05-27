const { defineConfig } = require('eslint/config');
const skuba = require('skuba/config/eslint');

module.exports = defineConfig([
  {
    extends: [skuba],
  },
]);
