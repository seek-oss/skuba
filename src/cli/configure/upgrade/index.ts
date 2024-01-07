import path from 'path';

import { readdir, writeFile } from 'fs-extra';
import { gte, sort } from 'semver';

import type { Logger } from '../../../utils/logging';
import { getConsumerManifest } from '../../../utils/manifest';
import { detectPackageManager } from '../../../utils/packageManager';
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

export const upgradeSkuba = async (mode: 'lint' | 'format', logger: Logger) => {
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

  // We are up to date, skip patches
  if (gte(manifestVersion, currentVersion)) {
    return { ok: true, fixable: false };
  }

  const patches = await getPatches(manifestVersion);

  if (patches.length === 0) {
    // TODO: Do we want to _always_ write the version?
    // Or only if there's associated patches for that version / it's missing?
    // Also see 'should return ok: true, fixable: false if there are no lints to apply despite package.json being out of date'
    return { ok: true, fixable: false };
  }

  if (mode === 'lint') {
    const packageManager = await detectPackageManager();

    logger.warn(
      `skuba has patches to apply. Run ${logger.bold(
        packageManager.exec,
        'skuba',
        'format',
      )} to run them. ${logger.dim('skuba-patches')}`,
    );

    // TODO: Do we want to declare patches as optional?
    // TODO: Should we return ok: true if all patches are no-ops?

    return { ok: false, fixable: true };
  }

  logger.plain('Updating skuba...');

  // Run these in series in case a subsequent patch relies on a previous patch
  for (const patch of patches) {
    const patchFile = await resolvePatch(patch);
    await patchFile.upgrade();
    logger.newline();
    logger.plain(`Patch ${patch} applied.`);
  }

  (manifest.packageJson.skuba as SkubaPackageJson).version = currentVersion;

  const updatedPackageJson = await formatPackage(manifest.packageJson);

  await writeFile(manifest.path, updatedPackageJson);
  logger.newline();
  logger.plain('skuba update complete.');
  logger.newline();

  return {
    ok: true,
    fixable: false,
  };
};
