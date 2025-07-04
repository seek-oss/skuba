import { Jest } from './src';

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
