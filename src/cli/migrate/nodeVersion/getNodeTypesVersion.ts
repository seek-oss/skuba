import { inspect } from 'util';

import { gt, satisfies, valid } from 'semver';

import { log } from '../../../utils/logging';
import { getNpmVersions } from '../../../utils/version';

type VersionResult = {
  version: string;
  err?: string;
};

export const getNodeTypesVersion = async (
  major: number,
  defaultVersion: string,
): Promise<VersionResult> => {
  try {
    const versions = await getNpmVersions('@types/node');

    const matchingVersions = Object.values(versions ?? {}).filter(
      (v) =>
        valid(v.version) &&
        satisfies(v.version, `${major}.x.x`) &&
        !v.deprecated,
    );

    if (!matchingVersions.length) {
      return {
        version: defaultVersion,
        err: `No matching @types/node versions for Node.js ${major}`,
      };
    }

    const { version } = matchingVersions.reduce((a, b) =>
      gt(a.version, b.version) ? a : b,
    );

    return {
      version,
    };
  } catch (err) {
    log.subtle(inspect(err));
    return {
      version: defaultVersion,
      err: `Failed to fetch latest @types/node version, using fallback version ${defaultVersion}`,
    };
  }
};
