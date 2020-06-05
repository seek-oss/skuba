module.exports = {
  ...require('@seek/skuba/config/jest'),

  coveragePathIgnorePatterns: ['src/testing'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
};
