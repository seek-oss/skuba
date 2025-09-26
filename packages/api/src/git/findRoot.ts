import fs from 'fs-extra';
import git from 'isomorphic-git';

interface FindRootParameters {
  dir: string;
}

/**
 * Returns the first Git root directory encountered walking up from the provided
 * `dir`.
 */
export const findRoot = async ({
  dir,
}: FindRootParameters): Promise<string | null> => {
  try {
    return await git.findRoot({ filepath: dir, fs });
  } catch (err) {
    if (err instanceof git.Errors.NotFoundError) {
      return null;
    }

    throw err;
  }
};
