import { Jest } from './src';

const defaultConfig = Jest.mergePreset({
  coveragePathIgnorePatterns: ['<rootDir>/integration/', '<rootDir>/template/'],
  displayName: 'unit',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/template/', '/test\\.ts'],
  watchPathIgnorePatterns: [
    '<rootDir>/integration/format/',
    '<rootDir>/integration/lint/',
  ],
});

const { transform, moduleNameMapper, setupFiles } = defaultConfig;

export default {
  ...defaultConfig,
  projects: [
    {
      transform,
      moduleNameMapper,
      setupFiles,
      displayName: 'unit',
      testPathIgnorePatterns: ['<rootDir>/template/', '\\.int\\.test\\.ts'],
    },
    {
      transform,
      moduleNameMapper,
      setupFiles,
      displayName: 'integration',
      testMatch: ['**/*.int.test.ts'],
    },
  ],
} satisfies Jest.Config.InitialOptions;
