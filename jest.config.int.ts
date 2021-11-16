import { Jest } from './src';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['<rootDir>/integration/', '<rootDir>/template/'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/template/', '/test\\.ts'],
  watchPathIgnorePatterns: [
    '<rootDir>/integration/format/',
    '<rootDir>/integration/lint/',
  ],
});
