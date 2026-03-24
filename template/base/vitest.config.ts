import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ['@seek/<%- serviceName %>/source'],
    },
  },
  test: {
    env: {
      DEPLOYMENT: 'test',
    },
    coverage: {
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
      include: ['src'],
      exclude: ['src/testing'],
    },
    include: ['**/*.test*.ts'],
  },
});
