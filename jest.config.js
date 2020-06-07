module.exports = {
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!<rootDir>/coverage*/**',
    '!<rootDir>/dist*/**',
    '!<rootDir>/lib*/**',
    '!<rootDir>/tmp*/**',
  ],
  coverageDirectory: 'coverage',
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules.*/',
    '<rootDir>/(coverage|dist|lib|tmp).*/',

    '<rootDir>/template/',
    '/test\\.ts',
  ],
};
