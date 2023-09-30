import { readdir } from 'fs/promises';
import path from 'path';

import { gte, sort } from 'semver';

import { getSkubaManifest } from '../../../utils/manifest';
import { getSkubaVersion } from '../../../utils/version';

const getPatches = async (manifestVersion: string): Promise<string[]> => {
  const filenames = await readdir(path.join(__dirname, 'patches'));

  return sort(filenames.filter((filename) => gte(filename, manifestVersion)));
};

export const upgradeSkuba = async () => {
  const [currentVersion, { version: manifestVersion }] = await Promise.all([
    getSkubaVersion(),
    getSkubaManifest(),
  ]);

  // We are up to date, avoid apply patches
  if (gte(manifestVersion, currentVersion)) {
    return;
  }

  const patches = await getPatches(manifestVersion);

  // TODO: Apply patches

  // TODO: Update manifest version
};
