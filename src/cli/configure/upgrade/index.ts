import { readdir, writeFile } from 'fs/promises';
import path from 'path';

import { gte, sort } from 'semver';

import { getConsumerManifest } from '../../../utils/manifest';
import { getSkubaVersion } from '../../../utils/version';
import { formatPackage } from '../processing/package';

const getPatches = async (manifestVersion: string): Promise<string[]> => {
  const patches = await readdir(path.join(__dirname, 'patches'));

  // The patches are sorted by the version they were added from.
  // Only return patches that are newer or equal to the current version.
  return sort(patches.filter((filename) => gte(filename, manifestVersion)));
};

export const upgradeSkuba = async () => {
  const [currentVersion, manifest] = await Promise.all([
    getSkubaVersion(),
    getConsumerManifest(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const manifestVersion = manifest?.packageJson.skuba?.version;

  if (!manifest || typeof manifestVersion !== 'string') {
    throw new Error(
      'Could not find a skuba manifest, please run `skuba configure`',
    );
  }

  // We are up to date, avoid apply patches
  if (gte(manifestVersion, currentVersion)) {
    return;
  }

  const patches = await getPatches(manifestVersion);

  // Run these in series in case a previous patch relies on another patch
  for (const patch of patches) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const patchFile = await import(`./patches/${patch}/index`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await patchFile.upgrade();
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  manifest.packageJson.skuba.version = currentVersion;

  const updatedPackageJson = await formatPackage(manifest.packageJson);

  await writeFile(manifest.path, updatedPackageJson);
};
