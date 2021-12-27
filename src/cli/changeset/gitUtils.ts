// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/utils.ts

import type { Octokit } from '@octokit/rest';
import fs from 'fs-extra';
import git from 'isomorphic-git';

import * as Git from '../../api/git';
import { appSlugFromEnvironment } from '../../api/github/environment';
import { log } from '../../utils/logging';

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
  octokit: Octokit,
): Promise<void> => {
  const appSlug = appSlugFromEnvironment();
  if (appSlug) {
    // Commit as bot user
    try {
      const response = await octokit.apps.getBySlug({
        app_slug: appSlug,
      });
      const name = `${response.data.name}[bot]`;
      const app = {
        name,
        email: `${response.data.id}+${name}@users.noreply.github.com`,
      };
      return await Git.commitAllChanges({
        dir,
        message,
        author: app,
        committer: app,
      });
    } catch (error) {
      log.warn('Failed to retrieve bot user details', error);
    }
  }

  // Commit as default skuba user
  await Git.commitAllChanges({
    dir,
    message,
  });
  return;
};

export const checkIfClean = async (dir: string): Promise<boolean> => {
  const changedFiles = await Git.getChangedFiles({ dir });
  return !changedFiles.length;
};
