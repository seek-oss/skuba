import type { Patches } from '../..';

import { tryClearNpmrcManagedSection } from './tryClearNpmrcManagedSection';

export const patches: Patches = [
  {
    apply: tryClearNpmrcManagedSection,
    description: 'Remove managed section from .npmrc',
  },
];
