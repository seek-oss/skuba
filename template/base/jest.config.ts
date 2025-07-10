import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  type?: string;
};
const isESM = packageJson.type === 'module';

export default {
  preset: 'skuba',
  ...(isESM && {
    extensionsToTreatAsEsm: ['.ts'],
  }),
  coveragePathIgnorePatterns: ['src/testing'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  moduleNameMapper: {
    '^#src$': '<rootDir>/src',
    '^#src\/(.*)\\.js$': '<rootDir>/src/$1',
    '^#src\/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/test\\.ts'],
};
