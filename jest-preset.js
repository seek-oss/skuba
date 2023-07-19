const { defaults } = require('ts-jest/presets');

const { createModuleNameMapper } = require('./jest/moduleNameMapper');
const { transform } = require('./jest/transform');

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  ...defaults,

  moduleNameMapper: createModuleNameMapper(),
  transform,

  collectCoverageFrom: [
    '**/*.ts',
    '**/*.tsx',
    '!**/node_modules*/**',
    '!<rootDir>/coverage*/**',
    '!<rootDir>/dist*/**',
    '!<rootDir>/lib*/**',
    '!<rootDir>/tmp*/**',
    '!<rootDir>/jest.*.ts',
  ],
  coverageDirectory: 'coverage',
  reporters: ['default', require.resolve('./lib/cli/test/reporters/github')],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules.*/',
    '<rootDir>/(coverage|dist|lib|tmp).*/',
  ],
  // jestjs/jest#14305
  prettierPath: null,
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
};
