module.exports = {
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules*/**',
    '!<rootDir>/coverage*/**',
    '!<rootDir>/dist*/**',
    '!<rootDir>/lib*/**',
    '!<rootDir>/tmp*/**',
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^src$': '<rootDir>/src',
    '^src/(.+)$': '<rootDir>/src/$1',
  },
  preset: 'skuba',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules.*/',
    '<rootDir>/(coverage|dist|lib|tmp).*/',
  ],
};
