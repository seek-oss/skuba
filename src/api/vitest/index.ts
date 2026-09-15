import {
  type ViteUserConfig,
  configDefaults,
  defaultExclude,
} from 'vitest/config';

import { mergeRaw } from '../../cli/configure/processing/record.js';

import { GitHubReporter } from './reporters/github/index.js';

export const defaults = {
  coverage: {
    include: ['**/*.ts', '**/*.tsx'],
    exclude: [
      '**/node_modules*/**',
      '**/coverage/**',
      '**/dist/**',
      '**/lib/**',
      '**/lib-*/**',
      '**/tmp/**',
      '**/vitest.*.ts',
      '**/tsdown.config.*ts',
    ],
  },
  exclude: defaultExclude,
  reporters: [...configDefaults.reporters, new GitHubReporter()],
} satisfies ViteUserConfig['test'];

const presetDefaults = {
  test: defaults,
} satisfies ViteUserConfig;

export const mergePreset = <T extends ViteUserConfig>(config: T): T =>
  mergeRaw(presetDefaults, config);

export { GitHubReporter };
