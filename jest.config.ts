import { Jest } from './src';

export default Jest.mergePreset({
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/template/',
    '\\.int\\.test\\.ts',
    '/test\\.ts',
  ],
});
