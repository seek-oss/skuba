import packageJson from 'package-json';

import { getSkubaManifest } from './manifest';
import { withTimeout } from './wait';

export const latestNpmVersion = async (
  packageName: string,
): Promise<string> => {
  const { version } = await packageJson(packageName);

  if (typeof version !== 'string') {
    throw new Error(`No version found for package "${packageName}"`);
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
