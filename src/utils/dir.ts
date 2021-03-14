import fs from 'fs-extra';
import ignore from 'ignore';

import { isErrorWithCode } from './error';

/**
 * Create a filter function that excludes filepaths based on `.gitignore`s.
 */
export const createInclusionFilter = async (gitIgnorePaths: string[]) => {
  const gitIgnores = await Promise.all(
    gitIgnorePaths.map(async (gitIgnorePath) => {
      try {
        return await fs.readFile(gitIgnorePath, 'utf8');
      } catch (err: unknown) {
        if (isErrorWithCode(err, 'ENOENT')) {
          return;
        }

        throw err;
      }
    }),
  );

  const managers = gitIgnores
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ignore().add(value));

  return ignore().add('.git').add(managers).createFilter();
};
