import type { Patches } from '../../index.js';
import { tryRemovePnpmPlugin } from '../15.0.1/removePnpmPlugin.js';
import { tryRemovePnpmConfigPackageJson } from '../15.3.0/removePnpmConfigPackageJson.js';

import { tryMountBuildkiteAgent } from './mountBuildkiteAgent.js';

export const patches: Patches = [
  {
    apply: tryMountBuildkiteAgent,
    description:
      'Use mount-buildkite-agent for Docker Compose Buildkite plugins',
  },
  {
    apply: tryRemovePnpmPlugin,
    description: 'Remove pnpm-plugin-skuba from pnpm-workspace.yaml',
  },
  {
    apply: tryRemovePnpmConfigPackageJson,
    description: 'Remove pnpm-plugin-skuba from package.json pnpm config',
  },
];
