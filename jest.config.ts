import * as Jest from './lib/api/jest/index.js';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['<rootDir>/integration/', '<rootDir>/template/'],
  displayName: 'unit',
  moduleNameMapper: {
    '^#src$': '<rootDir>/src',
    '^#src/(.*)\\.js$': '<rootDir>/src/$1',
    '^#src/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/template/', '/test\\.ts'],
  watchPathIgnorePatterns: [
    '<rootDir>/integration/format/',
    '<rootDir>/integration/lint/',
  ],
  roots: ['src'],
  projects: [
    {
      displayName: 'unit',
      roots: ['src', 'jest'],
      setupFiles: ['<rootDir>/jest.setup.ts'],
      testPathIgnorePatterns: [
        '<rootDir>/template/',
        '/test\\.ts',
        '\\.int\\.test\\.ts',
      ],
    },
    {
      displayName: 'integration',
      roots: ['src'],
      setupFiles: ['<rootDir>/jest.setup.ts'],
      testMatch: ['**/*.int.test.ts'],
    },
  ],
});
