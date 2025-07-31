import type { TSESLint } from '@typescript-eslint/utils';

import noSyncInPromiseIterable from './rules/no-sync-in-promise-iterable.js';

const plugin = {
  meta: {
    name: 'skuba',
    version: '1.0.0',
  },
  rules: {
    'no-sync-in-promise-iterable': noSyncInPromiseIterable,
  },
  configs: {},
} satisfies TSESLint.FlatConfig.Plugin;

plugin.configs = {
  recommended: [
    {
      plugins: {
        skuba: plugin,
      },
      rules: {
        'skuba/no-sync-in-promise-iterable': 'warn',
      },
    },
  ],
} satisfies TSESLint.FlatConfig.Plugin['configs'];

export default plugin;
