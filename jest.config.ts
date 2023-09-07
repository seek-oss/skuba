import { Jest } from './src';

const compilePackages = ['sort-package-json'];

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['<rootDir>/integration/', '<rootDir>/template/'],
  displayName: 'unit',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/template/',
    '\\.int\\.test\\.ts',
    '/test\\.ts',
  ],
  transform: {
    '^.+\\.m?[tj]s?$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: [`/node_modules/(?!(${compilePackages.join('|')}))`],
});
