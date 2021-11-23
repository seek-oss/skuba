import fs from 'fs-extra';
import git from 'isomorphic-git';

import { commit } from './commit';
import type { Identity } from './commit';
import { getChangedFiles } from './getChangedFiles';

interface CommitAllParameters {
  dir: string;
  message: string;
  author?: Identity;
  committer?: Identity;
}

/**
 * Stages all changes and writes a commit to the local Git repository.
 */
export const commitAllChanges = async ({
  dir,
  message,
  author,
  committer,
}: CommitAllParameters): Promise<void> => {
  const changedFiles = await getChangedFiles({ dir });
  await Promise.all(
    changedFiles.map((file) =>
      !file.deleted
        ? git.add({ fs, dir, filepath: file.path })
        : git.remove({ fs, dir, filepath: file.path }),
    ),
  );

  await commit({
    dir,
    message,
    author,
    committer,
  });
};
