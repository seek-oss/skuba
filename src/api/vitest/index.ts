import type { ViteUserConfig } from 'vitest/config';

import { mergeRaw } from '../../cli/configure/processing/record.js';

export const defaults = {
  coverage: {
    include: ['**/*.ts', '**/*.tsx'],
    exclude: [
      '**/node_modules*/**',
      'coverage*/**',
      'dist*/**',
      'lib*/**',
      'tmp*/**',
      'vitest.*.ts',
      'tsdown.config.*ts',
    ],
  },
} satisfies ViteUserConfig['test'];

const configDefaults = {
  test: defaults,
} satisfies ViteUserConfig;

export const mergePreset = (config: ViteUserConfig): ViteUserConfig =>
  mergeRaw(configDefaults, config);
