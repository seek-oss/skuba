// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/utils.ts

import fs from 'fs-extra';
import git from 'isomorphic-git';

import * as Git from '../../api/git';

export const push = async (
  dir: string,
  branch: string,
  token: string,
  { force }: { force?: boolean } = {},
) => {
  await Git.push({
    dir,
    auth: { type: 'gitHubApp', token },
    ref: branch,
    force,
  });
};

export const listTags = async (dir: string): Promise<string[]> =>
  git.listTags({
    fs,
    dir,
  });

export const pushTags = async (dir: string, tags: string[], token: string) => {
  await Promise.all(
    tags.map((tag) =>
      Git.push({
        auth: { type: 'gitHubApp', token },
        ref: tag,
        dir,
      }),
    ),
  );
};

export const switchToMaybeExistingBranch = async (
  dir: string,
  branch: string,
) => {
  try {
    await git.branch({
      fs,
      dir,
      ref: branch,
      checkout: true,
    });
  } catch (error) {
    if (error instanceof git.Errors.AlreadyExistsError) {
      await git.deleteBranch({
        fs,
        dir,
        ref: branch,
      });
      await git.branch({
        fs,
        dir,
        ref: branch,
        checkout: true,
      });
      return;
    }

    throw error;
  }
};

export const reset = async (dir: string, pathSpec: string, branch: string) => {
  await Git.reset({ dir, branch, commitId: pathSpec, hard: true });
};

export const commitAll = async (dir: string, message: string) => {
  // const user = await octokit.users.getAuthenticated();
  const user = {
    name: 'buildagencygitapitoken[bot]', // user.data.name as string
    email: '87109344+buildagencygitapitoken[bot]@users.noreply.github.com', // `${user.data.id}+${user.data.name}@users.noreply.github.com`
  };
  await Git.commitAllChanges({ dir, message, author: user, committer: user });
};

export const checkIfClean = async (dir: string): Promise<boolean> => {
  const changedFiles = await Git.getChangedFiles({ dir });
  return !changedFiles.length;
};
