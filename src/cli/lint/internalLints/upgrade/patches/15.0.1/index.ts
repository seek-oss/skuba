import type { Patches } from '../../index.ts';

import { tryRemovePnpmPlugin } from './removePnpmPlugin.ts';

export const patches: Patches = [
  {
    apply: tryRemovePnpmPlugin,
    description: 'Remove pnpm-plugin-skuba',
  },
];
