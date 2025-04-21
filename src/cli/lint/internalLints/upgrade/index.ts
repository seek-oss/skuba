import path from 'path';

import { readFile, readdir } from 'fs-extra';
import { gte, sort } from 'semver';

import {
  type LoadedSkubaConfig,
  loadSkubaConfig,
} from '../../../../config/load';
import { updateSkubaConfigVersion } from '../../../../config/update';
import { locateNearestFile } from '../../../../utils/dir';
import type { Logger } from '../../../../utils/logging';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../../utils/packageManager';
import { getSkubaVersion } from '../../../../utils/version';
import type { InternalLintResult } from '../../internal';

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
  config: LoadedSkubaConfig;
  packageManager: PackageManagerConfig;
  dir?: string;
};

export type PatchFunction = (config: PatchConfig) => Promise<PatchReturnType>;

const getPatches = async (manifestVersion: string): Promise<Patches> => {
  const patches = await readdir(path.join(__dirname, 'patches'), {
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

  return (await Promise.all(patchesForVersion.map(resolvePatches))).flat();
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
  const [
    currentVersion,
    originalSkubaConfig,
    nearestPackageJsonPath,
    packageManager,
  ] = await Promise.all([
    getSkubaVersion(),
    loadSkubaConfig(),
    locateNearestFile({ cwd: process.cwd(), filename: 'package.json' }),
    detectPackageManager(),
  ]);

  const skubaConfig = { ...originalSkubaConfig };

  if (nearestPackageJsonPath) {
    skubaConfig.configPath ??= path.join(
      path.dirname(nearestPackageJsonPath),
      'skuba.config.ts',
    );
  }

  if (!skubaConfig.configPath) {
    throw new Error('Could not find a package json for this project');
  }

  const lastPatchedVersion =
    skubaConfig.lastPatchedVersion ??
    (nearestPackageJsonPath
      ? (JSON.parse(await readFile(nearestPackageJsonPath, 'utf-8')) as {
          skuba?: { version?: string };
        })
      : undefined
    )?.skuba?.version ??
    '1.0.0';

  const manifestVersion = additionalFlags.includes('--force-apply-all-patches')
    ? '1.0.0'
    : lastPatchedVersion;

  // We are up to date, skip patches
  if (gte(manifestVersion, currentVersion)) {
    return { ok: true, fixable: false };
  }

  const patches = await getPatches(manifestVersion);
  // No patches to apply even if version out of date. Early exit to avoid unnecessary commits.
  if (patches.length === 0) {
    return { ok: true, fixable: false };
  }

  if (mode === 'lint') {
    const results = await Promise.all(
      patches.map(
        async ({ apply }) =>
          await apply({
            mode,
            config: skubaConfig,
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
        packageManager.print.exec,
        'skuba',
        'format',
      )} to run them.`,
    );

    return {
      ok: false,
      fixable: true,
      annotations: [
        {
          // skuba.config.ts as likely skuba version has changed
          // TODO: locate the lintPatchedVersion variable in the config for a better annotation
          path: skubaConfig.configPath,
          message: `skuba has patches to apply. Run ${packageManager.print.exec} skuba format to run them.`,
        },
      ],
    };
  }

  logger.plain('Updating skuba...');

  // Run these in series in case a subsequent patch relies on a previous patch
  for (const { apply, description } of patches) {
    const result = await apply({
      mode,
      config: skubaConfig,
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

  await updateSkubaConfigVersion({
    path: skubaConfig.configPath,
    version: currentVersion,
  });

  logger.newline();
  logger.plain('skuba update complete.');
  logger.newline();

  return {
    ok: true,
    fixable: false,
  };
};
