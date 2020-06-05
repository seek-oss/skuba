module.exports = {
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!<rootDir>/coverage/**',
    '!<rootDir>/lib/**',
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^src$': '<rootDir>/src',
    '^src/(.+)$': '<rootDir>/src/$1',
  },
  preset: '@seek/skuba',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/lib/'],
};
