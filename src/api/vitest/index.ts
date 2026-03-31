import {
  type ViteUserConfig,
  defaultExclude,
  defaultInclude,
} from 'vitest/config';

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
  exclude: defaultExclude,
  include: defaultInclude,
} satisfies ViteUserConfig['test'];

const configDefaults = {
  test: defaults,
} satisfies ViteUserConfig;

export const mergePreset = (config: ViteUserConfig): ViteUserConfig =>
  mergeRaw(configDefaults, config);
