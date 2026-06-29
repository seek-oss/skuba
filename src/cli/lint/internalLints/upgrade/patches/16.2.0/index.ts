import type { Patches } from '../../index.js';
import { tryRemovePnpmPlugin } from '../15.0.1/removePnpmPlugin.js';

export const patches: Patches = [
  {
    apply: tryRemovePnpmPlugin,
    description: 'Remove pnpm-plugin-skuba',
  },
];
