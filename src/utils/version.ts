import npmFetch from 'npm-registry-fetch';
import * as z from 'zod/v4';

import { getSkubaManifest } from './manifest.js';
import { withTimeout } from './wait.js';

const NpmVersions = z.record(
  z.string(),
  z.object({
    name: z.string(),
    version: z.string(),
    deprecated: z.string().optional(),
  }),
);

export type NpmVersions = z.infer<typeof NpmVersions>;

const PackageResponse = z.object({
  'dist-tags': z.record(z.string(), z.string()).optional(),
  versions: NpmVersions,
});

const getNpmPackage = async (packageName: string) => {
  try {
    const response = await npmFetch.json(packageName, {
      headers: {
        Accept:
          'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
      },
    });

    const parsedResponse = PackageResponse.safeParse(response);
    if (!parsedResponse.success) {
      throw new Error(
        `Failed to parse package response from npm for package ${packageName}`,
      );
    }

    return parsedResponse.data;
  } catch (error) {
    if (
      error instanceof Error &&
      'statusCode' in error &&
      error.statusCode === 404
    ) {
      return null;
    }
    throw error;
  }
};

export const getNpmVersions = async (
  packageName: string,
): Promise<NpmVersions | null> => {
  const response = await getNpmPackage(packageName);
  return response?.versions ?? null;
};

export const getLatestNpmVersion = async (
  packageName: string,
): Promise<string | null> => {
  const response = await getNpmPackage(packageName);
  return response?.['dist-tags']?.latest ?? null;
};

const latestSkubaVersion = async (): Promise<string | null> => {
  try {
    const result = await withTimeout(getLatestNpmVersion('skuba'), { s: 2 });

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
