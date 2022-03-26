// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/utils.ts

import fs from 'fs-extra';
import git from 'isomorphic-git';

import * as Git from '../../api/git';

export const push = async (
  dir: string,
  branch: string,
  token: string,
  { force }: { force?: boolean } = {},
): Promise<void> => {
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

export const pushTags = async (
  dir: string,
  tags: string[],
  token: string,
): Promise<void> => {
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
): Promise<void> => {
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

export const reset = async (
  dir: string,
  commitId: string,
  branch: string,
): Promise<void> => Git.reset({ dir, branch, commitId, hard: true });

export const commitAll = async (
  dir: string,
  message: string,
): Promise<void> => {
  await Git.commitAllChanges({
    dir,
    message,
  });
};

export const checkIfClean = async (dir: string): Promise<boolean> => {
  const changedFiles = await Git.getChangedFiles({ dir });
  return !changedFiles.length;
};
