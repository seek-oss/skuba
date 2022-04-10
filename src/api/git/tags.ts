import fs from 'fs-extra';
import git from 'isomorphic-git';

interface GetTagsParameters {
  dir: string;
}

export const getTags = async ({ dir }: GetTagsParameters): Promise<string[]> =>
  git.listTags({
    fs,
    dir,
  });
