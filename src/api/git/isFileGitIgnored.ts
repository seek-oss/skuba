import path from 'path';

import fs from 'fs-extra';

export const isFileGitIgnored = async ({
  absolutePath,
  gitRoot,
}: {
  absolutePath: string;
  gitRoot: string;
}): Promise<boolean> => {
  const git = await import('isomorphic-git');
  return git.isIgnored({
    dir: gitRoot,
    filepath: path.relative(gitRoot, absolutePath),
    fs,
  });
};
