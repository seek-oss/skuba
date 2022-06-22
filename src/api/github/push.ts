import { graphql } from '@octokit/graphql';
import type {
  CreateCommitOnBranchInput,
  FileAddition,
  FileDeletion,
} from '@octokit/graphql-schema';
import fs from 'fs-extra';

import * as Git from '../git';
import type { ChangedFile } from '../git/getChangedFiles';

import { apiTokenFromEnvironment } from './environment';

interface CreateCommitResult {
  createCommitOnBranch: {
    commit: {
      oid: string;
    };
  };
}

interface PushAllFileChangesParams {
  dir: string;
  /**
   * The branch name
   */
  branch: string;
  /**
   * The headline of the commit message
   */
  messageHeadline: string;
  /**
   * The body of the commit message
   */
  messageBody?: string;
  /**
   * Updates the local Git repository to reflect the new remote branch state
   */
  updateLocal?: boolean;
}

/**
 * Retrieves all file changes from the local Git repository using
 * `getChangedFiles`, then pushes the changes to a specified GitHub branch using
 * `pushFileChanges`.
 *
 * Returns the commit ID, or `undefined` if there are no changes to commit.
 *
 * The file changes will appear as verified commits on GitHub.
 *
 * This function is roughly equivalent to
 * `git add --all && git commit && git push`, but it will not update the local
 * Git repository unless `updateLocal` is specified.
 */
export const pushAllFileChanges = async ({
  dir,
  branch,
  messageHeadline,
  messageBody,
  updateLocal = false,
}: PushAllFileChangesParams): Promise<string | undefined> => {
  const changedFiles = await Git.getChangedFiles({ dir });
  if (!changedFiles.length) {
    return undefined;
  }

  const fileChanges = await readFileChanges(changedFiles);

  const commitId = await pushFileChanges({
    dir,
    branch,
    messageHeadline,
    messageBody,
    fileChanges,
  });

  if (updateLocal) {
    await Promise.all(
      [...fileChanges.additions, ...fileChanges.deletions].map((file) =>
        fs.rm(file.path),
      ),
    );

    await Git.fastForwardBranch({
      ref: branch,
      auth: { type: 'gitHubApp' },
      dir,
    });
  }

  return commitId;
};

export interface FileChanges {
  additions: FileAddition[];
  deletions: FileDeletion[];
}

/**
 * Takes a list of `ChangedFiles`, reads them from the file system, and maps
 * them to GitHub GraphQL `FileChanges`.
 *
 * https://docs.github.com/en/graphql/reference/input-objects#filechanges
 */
export const readFileChanges = async (
  changedFiles: ChangedFile[],
): Promise<FileChanges> => {
  const { added, deleted } = changedFiles.reduce<{
    added: string[];
    deleted: string[];
  }>(
    (files, changedFile) => {
      const filePath = changedFile.path;
      if (changedFile.state === 'deleted') {
        files.deleted.push(filePath);
      } else {
        files.added.push(filePath);
      }

      return files;
    },
    { added: [], deleted: [] },
  );

  const additions: FileAddition[] = await Promise.all(
    added.map(async (filePath) => ({
      path: filePath,
      contents: await fs.promises.readFile(filePath, {
        encoding: 'base64',
      }),
    })),
  );

  const deletions: FileDeletion[] = deleted.map((filePath) => ({
    path: filePath,
  }));

  return {
    additions,
    deletions,
  };
};

interface PushFileChangesParams {
  dir: string;
  /**
   * The branch name
   */
  branch: string;
  /**
   * The headline of the commit message
   */
  messageHeadline: string;
  /**
   * The body of the commit message
   */
  messageBody?: string;
  /**
   * File additions and deletions
   */
  fileChanges: FileChanges;
}

/**
 * Pushes file changes from the local workspace to a specified GitHub branch.
 *
 * The file changes will appear as verified commits on GitHub.
 *
 * This function is roughly equivalent to `git push`, but it will not update the
 * local Git repository.
 */
export const pushFileChanges = async ({
  dir,
  branch,
  messageHeadline,
  messageBody,
  fileChanges,
}: PushFileChangesParams): Promise<string> => {
  const authToken = apiTokenFromEnvironment();
  if (!authToken) {
    throw new Error(
      'Could not read a GitHub API token from the environment. Please set GITHUB_API_TOKEN or GITHUB_TOKEN.',
    );
  }

  const [{ owner, repo }, headCommitId] = await Promise.all([
    Git.getOwnerAndRepo({ dir }),
    Git.getHeadCommitId({ dir }),
  ]);

  const input: CreateCommitOnBranchInput = {
    branch: {
      repositoryNameWithOwner: `${owner}/${repo}`,
      branchName: branch,
    },
    message: {
      headline: messageHeadline,
      body: messageBody,
    },
    expectedHeadOid: headCommitId,
    clientMutationId: 'skuba',
    fileChanges,
  };

  const result = await graphql<CreateCommitResult>(
    `
      mutation Mutation($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            oid
          }
        }
      }
    `,
    {
      input,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    },
  );

  return result.createCommitOnBranch.commit.oid;
};
