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
  projects: [
    {
      setupFiles: ['<rootDir>/jest.setup.ts'],
      displayName: 'unit',
      testPathIgnorePatterns: [
        '<rootDir>/template/',
        '/test\\.ts',
        '\\.int\\.test\\.ts',
      ],
    },
    {
      setupFiles: ['<rootDir>/jest.setup.ts'],
      displayName: 'integration',
      testMatch: ['**/*.int.test.ts'],
    },
  ],
});
