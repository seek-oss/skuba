import fs from 'fs-extra';
import git from 'isomorphic-git';

import { commit } from './commit';
import type { Identity } from './commit';
import { getChangedFiles } from './getChangedFiles';

export const commitAllChanges = async ({
  dir,
  message,
  author,
  committer,
}: {
  dir: string;
  message: string;
  author?: Identity;
  committer?: Identity;
}): Promise<void> => {
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
