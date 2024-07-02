import searchNpm from 'libnpmsearch';
import type readPkgUp from 'read-pkg-up';
import validatePackageName from 'validate-npm-package-name';

import type { SkubaPackageJson } from '../cli/init/writePackageJson';

import { getSkubaManifest } from './manifest';
import { withTimeout } from './wait';

export const latestNpmVersion = async (
  packageName: string,
): Promise<string> => {
  const { validForNewPackages } = validatePackageName(packageName);

  if (!validForNewPackages) {
    throw new Error(`Package "${packageName}" does not have a valid name`);
  }

  const [result] = await searchNpm(packageName, { limit: 1, timeout: 5_000 });

  if (result?.name !== packageName) {
    throw new Error(
      `Package "${packageName}" does not exist on the npm registry`,
    );
  }

  return result.version;
};

const latestSkubaVersion = async (): Promise<string | null> => {
  try {
    const result = await withTimeout(latestNpmVersion('skuba'), { s: 2 });

    return result.ok ? result.value : null;
  } catch {
    return null;
  }
};

export const manifestSkubaVersion = (
  manifest: readPkgUp.NormalizedReadResult,
) => {
  const skuba = manifest.packageJson.skuba as SkubaPackageJson | undefined;

  return skuba?.version ?? '1.0.0';
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
