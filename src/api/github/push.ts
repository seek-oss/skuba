import path from 'path';

import type { CreateCommitOnBranchInput } from '@octokit/graphql-schema' with { 'resolution-mode': 'import' };
import fs from 'fs-extra';

import * as Git from '../git';

import { apiTokenFromEnvironment } from './environment';
import { graphql } from './octokit';

interface CreateCommitResult {
  createCommitOnBranch: {
    commit: {
      oid: string;
    };
  };
}

interface UploadAllFileChangesParams {
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
   * File changes to exclude from the upload.
   *
   * Defaults to `[]` (no exclusions).
   */
  ignore?: Git.ChangedFile[];
  /**
   * The body of the commit message
   */
  messageBody?: string;
  /**
   * Updates the local Git repository to match the new remote branch state
   */
  updateLocal?: boolean;
}

/**
 * Retrieves all file changes from the local Git repository using
 * `getChangedFiles`, then uploads the changes to a specified GitHub branch
 * using `uploadFileChanges`.
 *
 * Returns the commit ID, or `undefined` if there are no changes to commit.
 *
 * The file changes will appear as verified commits on GitHub.
 *
 * This will not update the local Git repository unless `updateLocal` is
 * specified.
 */
export const uploadAllFileChanges = async ({
  branch,
  dir,
  messageHeadline,

  ignore,
  messageBody,
  updateLocal = false,
}: UploadAllFileChangesParams): Promise<string | undefined> => {
  const changedFiles = await Git.getChangedFiles({ dir, ignore });

  if (!changedFiles.length) {
    return;
  }

  const fileChanges = await readFileChanges(dir, changedFiles);

  const commitId = await uploadFileChanges({
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

interface FileAddition {
  contents: unknown;
  path: string;
}

interface FileDeletion {
  path: string;
}

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
  dir: string,
  changedFiles: Git.ChangedFile[],
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

  const gitRoot = await Git.findRoot({ dir });

  const toGitHubPath = (filePath: string) => {
    if (!gitRoot) {
      return filePath;
    }

    const pathDir = path.relative(gitRoot, dir);

    return path.join(pathDir, filePath);
  };

  const additions: FileAddition[] = await Promise.all(
    added.map(async (filePath) => ({
      path: toGitHubPath(filePath),
      contents: await fs.promises.readFile(filePath, {
        encoding: 'base64',
      }),
    })),
  );

  const deletions: FileDeletion[] = deleted.map((filePath) => ({
    path: toGitHubPath(filePath),
  }));

  return {
    additions,
    deletions,
  };
};

interface UploadFileChangesParams {
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
 * Uploads file changes from the local workspace to a specified GitHub branch.
 *
 * The file changes will appear as verified commits on GitHub.
 *
 * This will not update the local Git repository.
 */
export const uploadFileChanges = async ({
  dir,
  branch,
  messageHeadline,
  messageBody,
  fileChanges,
}: UploadFileChangesParams): Promise<string> => {
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
