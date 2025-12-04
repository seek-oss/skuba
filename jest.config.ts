import * as Jest from './lib/api/jest/index.js';

process.env.FORCE_COLOR = 'false';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['<rootDir>/integration/', '<rootDir>/template/'],
  displayName: 'unit',
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
