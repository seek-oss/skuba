import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src'],
      thresholds: {
        branches: 94,
        functions: 80,
        lines: 96,
        statements: 96,
      },
    },
  },
});
