import { defineConfig } from 'vitest/config';

import { mergePreset } from './src/api/vitest/index.js';

// We need to inline read-package-up and its dependencies to allow for mocking fs in tests
const readPackageUpFsDeps = ['read-package-up', 'find-up-simple', 'read-pkg'];

export default defineConfig(
  mergePreset({
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
      projects: [
        {
          extends: true,
          test: {
            root: 'src',
            name: 'unit',
            exclude: ['**/*.int.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            root: 'src',
            name: 'integration',
            include: ['**/*.int.test.ts'],
          },
        },
      ],
      coverage: {
        include: ['src'],
      },
      exclude: ['**/node_modules'],
    },
    server: {
      watch: {
        ignored: ['**/integration/lint/**', '**/integration/format/**'],
      },
    },
  }),
);
