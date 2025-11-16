import { defineConfig } from 'vitest/config';

// We need to inline read-package-up and its dependencies to allow for mocking fs in tests
const readPackageUpFsDeps = ['read-package-up', 'find-up-simple', 'read-pkg'];

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ['@seek/skuba/source'],
    },
  },
  test: {
    server: {
      deps: {
        inline: [...readPackageUpFsDeps],
      },
    },
    env: {
      ENVIRONMENT: 'test',
      FORCE_COLOR: '0',
    },
    coverage: {
      thresholds: {
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
      include: ['src'],
      exclude: ['src/testing'],
    },
    include: ['**/*.test*.ts'],
    exclude: ['node_modules', 'template', 'packages'],
  },
});
