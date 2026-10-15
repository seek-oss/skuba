import type { Patches } from '../../index.ts';
import { tryRemovePnpmPlugin } from '../15.0.1/removePnpmPlugin.ts';
import { tryRemovePnpmConfigPackageJson } from '../15.3.0/removePnpmConfigPackageJson.ts';

import { tryMountBuildkiteAgent } from './mountBuildkiteAgent.ts';
import { tryRemoveDatadogNodeOptionsHack } from './removeDatadogNodeOptionsHack.ts';

export const patches: Patches = [
  {
    apply: tryMountBuildkiteAgent,
    description:
      'Use mount-buildkite-agent for Docker and Docker Compose Buildkite plugins',
  },
  {
    apply: tryRemovePnpmPlugin,
    description: 'Remove pnpm-plugin-skuba from pnpm-workspace.yaml',
  },
  {
    apply: tryRemovePnpmConfigPackageJson,
    description: 'Remove pnpm-plugin-skuba from package.json pnpm config',
  },
  {
    apply: tryRemoveDatadogNodeOptionsHack,
    description:
      'Replace the dd-trace NODE_OPTIONS Lambda hack with datadog-lambda-js >=12.140.0',
  },
];
