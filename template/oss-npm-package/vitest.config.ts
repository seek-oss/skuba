import { Vitest } from 'skuba';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  Vitest.mergePreset({
    ssr: {
      resolve: {
        conditions: ['@seek/<%- moduleName %>/source'],
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
        exclude: ['src/testing'],
      },
    },
  }),
);
