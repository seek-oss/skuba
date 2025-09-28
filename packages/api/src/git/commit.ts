import fs from 'fs-extra';
import git from 'isomorphic-git';

export interface Identity {
  email?: string;
  name?: string;
}

interface CommitParameters {
  author?: Identity;
  committer?: Identity;
  dir: string;
  message: string;
}

/**
 * Writes a commit to the local Git repository.
 */
export const commit = async ({
  author = { name: 'skuba' },
  committer = { name: 'skuba' },
  dir,
  message,
}: CommitParameters): Promise<string> =>
  git.commit({
    author,
    committer,
    dir,
    fs,
    message,
  });
