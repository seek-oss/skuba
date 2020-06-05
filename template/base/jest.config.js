module.exports = {
  ...require('skuba/config/jest'),

  coveragePathIgnorePatterns: ['src/testing'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
};
