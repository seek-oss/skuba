import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        branches: 84,
        functions: 58,
        lines: 81,
        statements: 79,
      },
    },
    exclude: ['**/node_modules'],
  },
});
