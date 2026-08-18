import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/cdk/nodejsFunction/integration/**',
      ],
      thresholds: {
        branches: 84,
        functions: 58,
        lines: 81,
        statements: 79,
        '**/cdk/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
    exclude: ['**/node_modules'],
  },
});
