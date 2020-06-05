module.exports = {
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!<rootDir>/lib/**',
    '!<rootDir>/coverage/**',
    '!<rootDir>/template/**',
  ],
  coverageDirectory: 'coverage',
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test.ts',
    '<rootDir>/lib/',
    '<rootDir>/template/',
  ],
};
