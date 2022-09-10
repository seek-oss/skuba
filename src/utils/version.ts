import path from 'path';

import validatePackageName from 'validate-npm-package-name';

import { getSkubaManifest } from './manifest';
import { isObject } from './validation';
import { withTimeout } from './wait';

const loadPackageJson = async (
  packageName: string,
): Promise<Record<string, unknown>> => {
  const { validForNewPackages } = validatePackageName(packageName);

  if (!validForNewPackages) {
    throw new Error(`Package "${packageName}" does not have a valid name`);
  }

  const message = `Package "${packageName}" does not have a valid package.json manifest`;

  let packageJson: unknown;
  try {
    packageJson = await import(path.posix.join(packageName, 'package.json'));
  } catch {
    throw new Error(message);
  }

  if (!isObject(packageJson)) {
    throw new Error(message);
  }

  return packageJson;
};

export const latestNpmVersion = async (
  packageName: string,
): Promise<string> => {
  const { version } = await loadPackageJson(packageName);

  if (typeof version !== 'string') {
    throw new Error(
      `Package "${packageName}" does not have a valid version in its package.json manifest`,
    );
  }

  return version;
};

const latestSkubaVersion = async (): Promise<string | null> => {
  try {
    const result = await withTimeout(latestNpmVersion('skuba'), { s: 2 });

    return result.ok ? result.value : null;
  } catch {
    return null;
  }
};

export const getSkubaVersion = async (): Promise<string> => {
  const { version } = await getSkubaManifest();

  return version;
};

type SkubaVersionInfo =
  | {
      isStale: true;

      local: string;
      latest: string;
    }
  | {
      isStale: false;

      local: string;
      latest: string | null;
    };

export const getSkubaVersionInfo = async (): Promise<SkubaVersionInfo> => {
  const [local, latest] = await Promise.all([
    getSkubaVersion(),
    latestSkubaVersion(),
  ]);

  if (latest === null) {
    // Assume we're up to date if we can't reach the npm registry
    return {
      isStale: false,
      local,
      latest,
    };
  }

  return {
    isStale: latest !== local,
    local,
    latest,
  };
};
