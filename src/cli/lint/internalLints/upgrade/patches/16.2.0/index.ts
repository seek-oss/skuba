import type { Patches } from '../../index.js';

import { tryMountBuildkiteAgent } from './mountBuildkiteAgent.js';

export const patches: Patches = [
  {
    apply: tryMountBuildkiteAgent,
    description:
      'Use mount-buildkite-agent for Docker Compose Buildkite plugins',
  },
];
