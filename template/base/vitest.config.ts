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
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
      include: ['src'],
      exclude: ['src/testing'],
    },
    include: ['**/*.test*.ts'],
  },
});
