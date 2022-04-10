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
}: CommitAllParameters): Promise<string | undefined> => {
  const changedFiles = await getChangedFiles({ dir });

  if (!changedFiles.length) {
    return;
  }

  await Promise.all(
    changedFiles.map((file) =>
      file.state === 'deleted'
        ? git.remove({ fs, dir, filepath: file.path })
        : git.add({ fs, dir, filepath: file.path }),
    ),
  );

  return commit({
    dir,
    message,
    author,
    committer,
  });
};
