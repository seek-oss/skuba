import { glob } from 'fast-glob';
import fs from 'fs-extra';
import { lt } from 'semver';

import { exec } from '../../../utils/exec.js';
import { log } from '../../../utils/logging.js';
import { detectPackageManager } from '../../../utils/packageManager.js';
import type { PatchReturnType } from '../../lint/internalLints/upgrade/index.js';

const packageVersionRegex = (packageName: string) =>
  new RegExp(`"${packageName}"\\s*:\\s*"([^"]+)"`, 'g');

const yamlPackageVersionRegex = (packageName: string) =>
  new RegExp(`${packageName}:\\s*([^\\s]+)`, 'g');

type PackageInfo = {
  name: string;
  version: string;
};

export const upgradeInfraPackages = async (
  mode: 'lint' | 'format',
  packages: PackageInfo[],
): Promise<PatchReturnType> => {
  const [packageJsonPaths, pnpmWorkSpacePaths] = await Promise.all([
    glob(['**/package.json'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
    glob('**/pnpm-workspace.yaml', {
      ignore: ['**/.git', '**/node_modules'],
    }),
  ]);

  if (packageJsonPaths.length === 0 && pnpmWorkSpacePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no package.json files found',
    };
  }

  const [packageJsons, pnpmWorkspaces] = await Promise.all([
    Promise.all(
      packageJsonPaths.map(async (file) => {
        const contents = await fs.readFile(file, 'utf8');

        return {
          file,
          contents,
        };
      }),
    ),
    Promise.all(
      pnpmWorkSpacePaths.map(async (file) => {
        const contents = await fs.readFile(file, 'utf8');

        return {
          file,
          contents,
        };
      }),
    ),
  ]);

  const patchedPackageJsons = packageJsons
    .map((file) => {
      const updated = packages.reduce((contents, packageName) => {
        const regex = packageVersionRegex(packageName.name);
        return contents.replaceAll(regex, (match, currentVersion: string) => {
          const versionPrefix = ['^', '~'].includes(currentVersion[0] as string)
            ? currentVersion[0]
            : '';
          const prefixLessCurrentVersion = versionPrefix
            ? currentVersion.slice(1)
            : currentVersion;

          return lt(prefixLessCurrentVersion, packageName.version)
            ? `"${packageName.name}":"${versionPrefix}${packageName.version}"`
            : match;
        });
      }, file.contents);

      return {
        ...file,
        updated,
      };
    })
    .filter(({ contents, updated }) => contents !== updated);

  const patchedPnpmWorkspaces = pnpmWorkspaces
    .map((file) => {
      const updated = packages.reduce((contents, packageName) => {
        const regex = yamlPackageVersionRegex(packageName.name);
        return contents.replace(regex, (match, currentVersion: string) => {
          const versionPrefix = ['^', '~'].includes(currentVersion[0] as string)
            ? currentVersion[0]
            : '';
          const prefixLessCurrentVersion = versionPrefix
            ? currentVersion.slice(1)
            : currentVersion;

          return lt(prefixLessCurrentVersion, packageName.version)
            ? `${packageName.name}: ${versionPrefix}${packageName.version}`
            : match;
        });
      }, file.contents);

      return {
        ...file,
        updated,
      };
    })
    .filter(({ contents, updated }) => contents !== updated);

  if (patchedPackageJsons.length === 0 && patchedPnpmWorkspaces.length === 0) {
    return {
      result: 'skip',
      reason: 'no package.json or pnpm-workspace.yaml files to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    [...patchedPackageJsons, ...patchedPnpmWorkspaces].map(
      async ({ file, updated }) => {
        await fs.writeFile(file, updated, 'utf8');
      },
    ),
  );

  const packageManager = await detectPackageManager();

  await exec(packageManager.command, 'install');

  return {
    result: 'apply',
  };
};

export const tryUpgradeInfraPackages = async (
  mode: 'lint' | 'format',
  packages: PackageInfo[],
): Promise<PatchReturnType> => {
  try {
    return await upgradeInfraPackages(mode, packages);
  } catch (err) {
    log.err('Failed to upgrade infrastructure packages');
    log.err(err);
    return { result: 'skip', reason: 'due to an error' };
  }
};
