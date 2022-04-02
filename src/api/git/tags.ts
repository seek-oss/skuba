import fs from 'fs-extra';
import git from 'isomorphic-git';

export const getTags = async (dir: string): Promise<string[]> =>
  git.listTags({
    fs,
    dir,
  });
