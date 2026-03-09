import type { NormalizedPackageJson } from 'read-pkg-up';

import { exec as defaultExec } from '../../utils/exec.js';

export const installPnpmPlugin = async (
  skubaManifest: NormalizedPackageJson,
  exec = defaultExec,
): Promise<void> => {
  const version = skubaManifest.dependencies?.['pnpm-plugin-skuba'] || 'latest';

  await exec('pnpm', 'add', '--config', `pnpm-plugin-skuba@${version}`);

  // Run install to ensure that the pnpmfileChecksum gets written
  await exec(
    'pnpm',
    'install',
    '--no-frozen-lockfile',
    '--prefer-offline',
    '--force', // force is required for pnpm to apply any additional hoisting rules from the plugin on install
  );
};
