import latestVersion from 'latest-version';

import { getSkubaManifest } from './manifest.js';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const latestSkubaVersion = async (): Promise<string | null> => {
  try {
    // Don't pull an Apple; bail out before holding up the command for too long
    const result = await Promise.race([latestVersion('skuba'), sleep(2_000)]);

    return typeof result === 'string' ? result : null;
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
