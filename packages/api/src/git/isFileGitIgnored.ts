import path from 'path';

import fs from 'fs-extra';
import git from 'isomorphic-git';

export const isFileGitIgnored = ({
  absolutePath,
  gitRoot,
}: {
  absolutePath: string;
  gitRoot: string;
}): Promise<boolean> =>
  git.isIgnored({
    dir: gitRoot,
    filepath: path.relative(gitRoot, absolutePath),
    fs,
  });
