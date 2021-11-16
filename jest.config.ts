import { Jest } from './src';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['<rootDir>/integration/', '<rootDir>/template/'],
  displayName: 'unit',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/template/',
    '\\.int\\.test\\.ts',
    '/test\\.ts',
  ],
});
