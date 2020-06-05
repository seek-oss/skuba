module.exports = {
  coverageDirectory: 'coverage',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test.ts',
    '<rootDir>/lib/',
    '<rootDir>/template/',
  ],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!<rootDir>/lib/**',
    '!<rootDir>/coverage/**',
    '!<rootDir>/template/**',
  ],
};
