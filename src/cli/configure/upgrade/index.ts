import { readdir } from 'fs/promises';
import path from 'path';

import { gte, sort } from 'semver';

import { getSkubaManifest } from '../../../utils/manifest';
import { getSkubaVersion } from '../../../utils/version';

const getPatches = async (manifestVersion: string): Promise<string[]> => {
  const patches = await readdir(path.join(__dirname, 'patches'));

  // The patches are sorted by the version they were added from.
  // Only return patches that are newer or equal to the current version.
  return sort(patches.filter((filename) => gte(filename, manifestVersion)));
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

  // Run these in series in case a previous patch relies on another patch
  for (const patch of patches) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
    const patchFile = require(`./patches/${patch}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await patchFile.upgrade();
  }

  // TODO Update manifest version
};
