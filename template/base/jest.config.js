const { Jest } = require('skuba');

module.exports = Jest.extend({
  coveragePathIgnorePatterns: ['src/testing'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/test\\.ts'],
});
