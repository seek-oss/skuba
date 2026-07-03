import type { Patches } from '../../index.js';
import { tryRemovePnpmPlugin } from '../15.0.1/removePnpmPlugin.js';
import { tryRemovePnpmConfigPackageJson } from '../15.3.0/removePnpmConfigPackageJson.js';

import { tryRemoveDatadogNodeOptionsHack } from './removeDatadogNodeOptionsHack.js';

export const patches: Patches = [
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
