import path from 'path';

import fs from 'fs-extra';
import git from 'isomorphic-git';

import { FILEPATH, STAGE, UNMODIFIED, WORKDIR } from './statusMatrix.js';

interface ResetParameters {
  dir: string;
  branch: string;
  commitId: string;
  hard?: boolean;
}

/**
 * Resets the specified branch in the local Git repository to a particular
 * commit.
 */
export const reset = async ({
  dir,
  branch,
  commitId,
  hard,
}: ResetParameters): Promise<void> => {
  await fs.promises.writeFile(
    path.join(dir, '.git/refs/heads', branch),
    `${commitId}\n`,
  );

  if (hard) {
    const allFiles = await git.statusMatrix({ dir, fs });
    // Get all files which have been modified or staged - does not include new untracked files or deleted files
    const modifiedFiles = allFiles
      .filter((row) => row[WORKDIR] > UNMODIFIED && row[STAGE] > UNMODIFIED)
      .map((row) => row[FILEPATH]);

    // Delete modified/staged files
    await Promise.all(
      modifiedFiles.map((filePath) => fs.promises.rm(filePath)),
    );

    // This will bring in the unmodified versions of files plus any files which were deleted
    await git.checkout({ dir, fs, ref: branch, force: true });
  }
};
