const { defaults: tsJestDefaults } = require('ts-jest/presets');

const TS_JEST_NAME = 'ts-jest';

/**
 * Resolved path of the `ts-jest` preset.
 *
 * This allows Jest to resolve the preset even if it is installed to a nested
 * `./node_modules/skuba/node_modules/ts-jest` directory.
 */
const TS_JEST_PATH = require.resolve(TS_JEST_NAME);

// Rewrite `ts-jest` transformations using our resolved `TS_JEST_PATH`.
const tsJestTransform = Object.fromEntries(
  Object.entries(tsJestDefaults.transform).map(([key, value]) => [
    key,
    value === TS_JEST_NAME ? TS_JEST_PATH : value,
  ]),
);

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  ...tsJestDefaults,

  transform: tsJestTransform,

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
  moduleNameMapper: {
    '^src$': '<rootDir>/src',
    '^src/(.+)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules.*/',
    '<rootDir>/(coverage|dist|lib|tmp).*/',
  ],
};
