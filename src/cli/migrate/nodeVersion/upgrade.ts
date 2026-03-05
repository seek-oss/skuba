import { inspect } from 'node:util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';
import { coerce, lt } from 'semver';

import { exec } from '../../../utils/exec.js';
import { log } from '../../../utils/logging.js';
import { detectPackageManager } from '../../../utils/packageManager.js';
import type { PatchReturnType } from '../../lint/internalLints/upgrade/index.js';

const packageVersionRegex = (packageName: string) =>
  new RegExp(`"\\b${packageName}\\b"\\s*:\\s*"([^"]+)"`, 'g');

const yamlPackageVersionRegex = (packageName: string) =>
  new RegExp(`\\b${packageName}\\b:\\s*([^\\s]+)`, 'g');

const normalizeVersionRange = (
  currentVersion: string,
  newVersion: string,
): string => {
  if (currentVersion.startsWith('^')) {
    const coercedCurrent = coerce(currentVersion);
    if (coercedCurrent && lt(coercedCurrent, newVersion)) {
      return `^${newVersion}`;
    }
    return currentVersion;
  }

  if (currentVersion.startsWith('~')) {
    const coercedCurrent = coerce(currentVersion);
    if (coercedCurrent && lt(coercedCurrent, newVersion)) {
      return `~${newVersion}`;
    }
    return currentVersion;
  }

  // >=1.2.3, >1.2.3
  if (currentVersion.startsWith('>=') || currentVersion.startsWith('>')) {
    const coercedCurrent = coerce(currentVersion);
    if (coercedCurrent && lt(coercedCurrent, newVersion)) {
      return `^${newVersion}`;
    }
    return currentVersion;
  }

  // <=1.2.3, <1.2.3 - always convert since they don't guarantee target version
  if (currentVersion.startsWith('<=') || currentVersion.startsWith('<')) {
    return `^${newVersion}`;
  }

  // 1.x, 1.2.x, 1.x.x
  if (currentVersion.includes('x') || currentVersion.includes('X')) {
    const coercedCurrent = coerce(currentVersion);
    if (coercedCurrent && lt(coercedCurrent, newVersion)) {
      return `^${newVersion}`;
    }
    return currentVersion;
  }

  // 1.0.0 - 2.0.0
  if (currentVersion.includes(' - ')) {
    const coercedCurrent = coerce(currentVersion);
    if (coercedCurrent && lt(coercedCurrent, newVersion)) {
      return `^${newVersion}`;
    }
    return currentVersion;
  }

  const coercedCurrent = coerce(currentVersion);
  if (coercedCurrent && lt(coercedCurrent, newVersion)) {
    return newVersion;
  }

  return currentVersion;
};

type PackageInfo = {
  name: string;
  version: string;
};

export const upgradeInfraPackages = async (
  mode: 'lint' | 'format',
  packages: PackageInfo[],
): Promise<PatchReturnType> => {
  const [packageJsonPaths, pnpmWorkspacePaths] = await Promise.all([
    glob(['**/package.json'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
    glob('**/pnpm-workspace.yaml', {
      ignore: ['**/.git', '**/node_modules'],
    }),
  ]);

  if (packageJsonPaths.length === 0 && pnpmWorkspacePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no package.json or pnpm-workspace.yaml files found',
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
      pnpmWorkspacePaths.map(async (file) => {
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
          if (
            currentVersion.startsWith('*') ||
            currentVersion.startsWith('workspace:') ||
            currentVersion.startsWith('link:') ||
            currentVersion.startsWith('file:') ||
            currentVersion.startsWith('catalog:')
          ) {
            return match;
          }

          const newVersion = normalizeVersionRange(
            currentVersion,
            packageName.version,
          );

          return newVersion === currentVersion
            ? match
            : `"${packageName.name}":"${newVersion}"`;
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
          const newVersion = normalizeVersionRange(
            currentVersion,
            packageName.version,
          );

          return newVersion === currentVersion
            ? match
            : `${packageName.name}: ${newVersion}`;
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

  await exec(
    packageManager.command,
    'install',
    '--frozen-lockfile=false',
    '--prefer-offline',
  );

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
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
