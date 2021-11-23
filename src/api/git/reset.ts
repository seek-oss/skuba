import path from 'path';

import fs from 'fs-extra';
import git from 'isomorphic-git';

import { FILEPATH, STAGE, UNCHANGED, WORKDIR } from './statusMatrix';

interface ResetParameters {
  dir: string;
  branch: string;
  commitOid: string;
  hard?: boolean;
}

export const reset = async ({
  dir,
  branch,
  commitOid,
  hard,
}: ResetParameters): Promise<void> => {
  await fs.promises.writeFile(
    path.join(dir, '.git/refs/heads', branch),
    `${commitOid}\n`,
  );

  if (hard) {
    const allFiles = await git.statusMatrix({ dir, fs });
    // Get all files which have been modified or staged - does not include new untracked files or deleted files
    const modifiedFiles = allFiles
      .filter((row) => row[WORKDIR] > UNCHANGED && row[STAGE] > UNCHANGED)
      .map((row) => row[FILEPATH]);

    // Delete modified/staged files
    await Promise.all(
      modifiedFiles.map((filePath) => fs.promises.rm(filePath)),
    );

    // This will bring in the unmodified versions of files plus any files which were deleted
    await git.checkout({ dir, fs, ref: branch, force: true });
  }
};
