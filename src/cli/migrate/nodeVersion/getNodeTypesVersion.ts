import npmFetch from 'npm-registry-fetch';
import { gt, satisfies, valid } from 'semver';
import { z } from 'zod';

type VersionResult = {
  version: string;
  err?: string;
};

const NpmFetchResponse = z.record(
  z.string(),
  z.object({
    name: z.string(),
    version: z.string(),
  }),
);

export const getNodeTypesVersion = async (
  major: number,
  defaultVersion: string,
): Promise<VersionResult> => {
  try {
    const response = await npmFetch.json('@types/node', {
      headers: {
        Accept:
          'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
      },
    });

    const parsedVersion = NpmFetchResponse.safeParse(response);
    if (!parsedVersion.success) {
      throw new Error('Failed to parse response');
    }

    const version = Object.values(parsedVersion.data)
      .filter((v) => valid(v.version) && satisfies(v.version, `${major}.x.x`))
      .reduce((a, b) => (gt(a.version, b.version) ? a : b)).version;

    return {
      version,
    };
  } catch {
    return {
      version: defaultVersion,
      err: 'Failed to fetch latest version, using fallback version',
    };
  }
};
