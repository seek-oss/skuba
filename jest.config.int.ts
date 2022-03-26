import { Jest } from './src';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['<rootDir>/integration/', '<rootDir>/template/'],
  resolver: '<rootDir>/jest/resolver.js',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/template/', '/test\\.ts'],
  watchPathIgnorePatterns: [
    '<rootDir>/integration/format/',
    '<rootDir>/integration/lint/',
  ],
});
