const { defineConfig } = require('eslint/config');
const skubaConfigs = require('eslint-config-skuba');

module.exports = defineConfig([
  {
    extends: skubaConfigs,
  },
]);
