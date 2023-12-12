import { readdir, writeFile } from 'fs/promises';
import path from 'path';

import { gte, sort } from 'semver';

import { log } from '../../../utils/logging';
import { getConsumerManifest } from '../../../utils/manifest';
import { getSkubaVersion } from '../../../utils/version';
import type { SkubaPackageJson } from '../../init/writePackageJson';
import { formatPackage } from '../processing/package';

const getPatches = async (manifestVersion: string): Promise<string[]> => {
  const patches = await readdir(path.join(__dirname, 'patches'));

  // The patches are sorted by the version they were added from.
  // Only return patches that are newer or equal to the current version.
  return sort(patches.filter((filename) => gte(filename, manifestVersion)));
};

const fileExtensions = ['js', 'ts'];

const resolvePatch = async (
  patch: string,
): Promise<
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  typeof import('/Users/samc/work/skuba/src/cli/configure/upgrade/patches/7.3.1/index')
> => {
  for (const extension of fileExtensions) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await import(`./patches/${patch}/index.${extension}`);
    } catch {
      // Ignore
    }
  }
  throw new Error(`Could not resolve patch ${patch}`);
};

export const upgradeSkuba = async () => {
  const [currentVersion, manifest] = await Promise.all([
    getSkubaVersion(),
    getConsumerManifest(),
  ]);

  const manifestVersion = (
    manifest?.packageJson.skuba as SkubaPackageJson | undefined
  )?.version;

  if (!manifest || !manifestVersion) {
    throw new Error(
      'Could not find a skuba manifest, please run `skuba configure`',
    );
  }

  // We are up to date, avoid apply patches
  if (gte(manifestVersion, currentVersion)) {
    return;
  }

  log.newline();
  log.plain('Updating skuba...');

  const patches = await getPatches(manifestVersion);

  // Run these in series in case a previous patch relies on another patch
  for (const patch of patches) {
    const patchFile = await resolvePatch(patch);
    await patchFile.upgrade();
    log.newline();
    log.plain(`Patch ${patch} applied.`);
  }

  (manifest.packageJson.skuba as SkubaPackageJson).version = currentVersion;

  const updatedPackageJson = await formatPackage(manifest.packageJson);

  await writeFile(manifest.path, updatedPackageJson);
  log.newline();
  log.plain('Skuba update finished.');
  log.newline();
};
