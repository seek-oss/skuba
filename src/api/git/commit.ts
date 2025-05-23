import fs from 'fs-extra';

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
}: CommitParameters): Promise<string> => {
  const git = await import('isomorphic-git');
  return git.commit({
    author,
    committer,
    dir,
    fs,
    message,
  });
};
