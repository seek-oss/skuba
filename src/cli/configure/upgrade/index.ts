import path from 'path';

import { readdir, writeFile } from 'fs-extra';
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

export type Patch = {
  upgrade: () => Promise<void>;
};

// Hack to allow our Jest environment/transform to resolve the patches
// In normal scenarios this will resolve immediately after the .js import
const resolvePatch = async (patch: string): Promise<Patch> => {
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

  if (!manifest) {
    throw new Error('Could not find a package json for this project');
  }

  manifest.packageJson.skuba ??= { version: '1.0.0' };

  const manifestVersion = (manifest.packageJson.skuba as SkubaPackageJson)
    .version;

  // We are up to date, avoid apply patches
  if (gte(manifestVersion, currentVersion)) {
    return;
  }

  log.plain('Updating skuba...');

  const patches = await getPatches(manifestVersion);

  // Run these in series in case a subsequent patch relies on a previous patch
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
  log.plain('skuba update complete.');
  log.newline();
};
