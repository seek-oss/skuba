const { testPathIgnorePatterns } = require('skuba/config/jest');

module.exports = {
  coveragePathIgnorePatterns: ['src/testing'],
  preset: 'skuba',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [...testPathIgnorePatterns, '/test\\.ts'],
};
