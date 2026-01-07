import type { NormalizedPackageJson } from 'read-pkg-up';

import { exec } from '../../utils/exec.js';

export const installPnpmPlugin = async (
  skubaManifest: NormalizedPackageJson,
): Promise<void> => {
  const version =
    skubaManifest.devDependencies?.['pnpm-plugin-skuba'] || 'latest';

  await exec('pnpm', 'add', '--config', `pnpm-plugin-skuba@${version}`);

  // Run install to ensure that the pnpmfileChecksum gets written
  await exec('pnpm', 'install', '--lockfile-only');
};
