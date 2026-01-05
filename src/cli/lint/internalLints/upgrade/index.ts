import path from 'path';

import fs from 'fs-extra';
import type { ReadResult } from 'read-pkg-up';
import { gte, sort } from 'semver';

import { type Logger, log } from '../../../../utils/logging.js';
import { getConsumerManifest } from '../../../../utils/manifest.js';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../../utils/packageManager.js';
import { getSkubaVersion } from '../../../../utils/version.js';
import { formatPackage } from '../../../configure/processing/package.js';
import type { SkubaPackageJson } from '../../../init/writePackageJson.js';
import { getIgnores, shouldCommit } from '../../autofix.js';
import type { InternalLintResult } from '../../internal.js';

import { Git } from '@skuba-lib/api';

export type Patches = Patch[];
export type Patch = {
  apply: PatchFunction;
  description: string;
};
export type PatchReturnType =
  | { result: 'apply' }
  | { result: 'skip'; reason?: string };

export type PatchConfig = {
  mode: 'format' | 'lint';
  manifest: ReadResult;
  packageManager: PackageManagerConfig;
  dir?: string;
};

export type PatchFunction = (config: PatchConfig) => Promise<PatchReturnType>;

const getPatches = async (
  manifestVersion: string,
): Promise<Map<string, Patches>> => {
  const patches = await fs.readdir(path.join(__dirname, 'patches'), {
    withFileTypes: true,
  });

  // The patches are sorted by the version they were added from.
  // Only return patches that are newer or equal to the current version.
  const patchesForVersion = sort(
    patches.flatMap((patch) =>
      // Is a directory rather than a JavaScript source file
      patch.isDirectory() &&
      // Has been added since the last patch run on the project
      gte(patch.name, manifestVersion)
        ? patch.name
        : [],
    ),
  );

  return new Map<string, Patches>(
    await Promise.all(
      patchesForVersion.map(async (version) => {
        const resolved = await resolvePatches(version);
        return [version, resolved] as const;
      }),
    ),
  );
};

const fileExtensions = ['js', 'ts'];

// Hack to allow our Jest environment/transform to resolve the patches
// In normal scenarios this will resolve immediately after the .js import
const resolvePatches = async (version: string): Promise<Patches> => {
  for (const extension of fileExtensions) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (await import(`./patches/${version}/index.${extension}`)).patches;
    } catch {
      // Ignore
    }
  }
  throw new Error(`Could not resolve patches for ${version}`);
};

export const upgradeSkuba = async (
  mode: 'lint' | 'format',
  logger: Logger,
  additionalFlags: string[] = [],
): Promise<InternalLintResult> => {
  const [currentVersion, manifest, packageManager] = await Promise.all([
    getSkubaVersion(),
    getConsumerManifest(),
    detectPackageManager(),
  ]);

  if (!manifest) {
    throw new Error('Could not find a package json for this project');
  }

  manifest.packageJson.skuba ??= { version: '1.0.0' };

  const manifestVersion = additionalFlags.includes('--force-apply-all-patches')
    ? '1.0.0'
    : (manifest.packageJson.skuba as SkubaPackageJson).version;

  // We are up to date, skip patches
  if (gte(manifestVersion, currentVersion)) {
    return { ok: true, fixable: false };
  }

  const patches = await getPatches(manifestVersion);
  // No patches to apply even if version out of date. Early exit to avoid unnecessary commits.
  if (patches.size === 0) {
    return { ok: true, fixable: false };
  }

  if (mode === 'lint') {
    const allPatches = Array.from(patches.values()).flat();
    const results = await Promise.all(
      allPatches.map(
        async ({ apply }) =>
          await apply({
            mode,
            manifest,
            packageManager,
          }),
      ),
    );

    // No patches are applicable. Early exit to avoid unnecessary commits.
    if (results.every(({ result }) => result === 'skip')) {
      return { ok: true, fixable: false };
    }

    logger.warn(
      `skuba has patches to apply. Run ${logger.bold(
        `${packageManager.print.exec} skuba format`,
      )} to run them.`,
    );

    return {
      ok: false,
      fixable: true,
      annotations: [
        {
          // package.json as likely skuba version has changed
          // TODO: locate the "skuba": {} config in the package.json and annotate on the version property
          path: manifest.path,
          message: `skuba has patches to apply. Run ${packageManager.print.exec} skuba format to run them.`,
        },
      ],
    };
  }

  logger.plain('Updating skuba...');

  const dir = process.cwd();
  let currentBranch;
  try {
    currentBranch = await Git.currentBranch({ dir });
  } catch {}

  const shouldCommitChanges = await shouldCommit({ currentBranch, dir });

  // Run these in series in case a subsequent patch relies on a previous patch
  for (const version of patches.keys()) {
    const patchesForVersion = patches.get(version);
    if (!patchesForVersion) {
      continue;
    }

    for (const { apply, description } of patchesForVersion) {
      const result = await apply({
        mode,
        manifest,
        packageManager,
      });
      logger.newline();
      if (result.result === 'skip') {
        logger.plain(
          `Patch skipped: ${description}${
            result.reason ? ` - ${result.reason}` : ''
          }`,
        );
      } else {
        logger.plain(`Patch applied: ${description}`);
      }
    }

    if (shouldCommitChanges) {
      // Only commit changes here, each version should have a separate commit and they should all be pushed together at the end
      const ref = await Git.commitAllChanges({
        dir,
        message: `Run \`skuba format\` for ${version}`,

        ignore: await getIgnores(dir),
      });

      if (!ref) {
        log.warn('No autofixes detected.');
        return { ok: true, fixable: false };
      }
    }
  }

  const updatedManifest = await getConsumerManifest();
  if (!updatedManifest) {
    throw new Error('Could not find a package json for this project');
  }

  (updatedManifest.packageJson.skuba as SkubaPackageJson).version =
    currentVersion;

  const updatedPackageJson = await formatPackage(updatedManifest.packageJson);

  await fs.writeFile(updatedManifest.path, updatedPackageJson);
  logger.newline();
  logger.plain('skuba update complete.');
  logger.newline();

  return {
    ok: true,
    fixable: false,
  };
};
