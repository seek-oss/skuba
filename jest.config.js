const skubaConfig = require('./config/jest');

module.exports = {
  preset: './jest-preset.js',

  setupFiles: ['<rootDir>/jest.setup.ts'],

  testPathIgnorePatterns: [
    ...skubaConfig.testPathIgnorePatterns,

    '<rootDir>/template/',
    '/test\\.ts',
  ],
};
