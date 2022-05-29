import fs from 'fs/promises';

import { graphql } from '@octokit/graphql';
import type {
  CreateCommitOnBranchInput,
  FileAddition,
  FileDeletion,
} from '@octokit/graphql-schema';

import * as Git from '../git';
import type { ChangedFile } from '../git/getChangedFiles';

import { apiTokenFromEnvironment } from './environment';

interface CreateCommitResult {
  createCommitOnBranch: {
    commit: {
      id: string;
    };
  };
}

interface CommitAndPushAllChangesParams {
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
   * Updates the local git working directory to reflect the new remote state
   */
  updateLocal?: boolean;
}

export const commitAndPushAllChanges = async ({
  dir,
  branch,
  messageHeadline,
  messageBody,
  updateLocal,
}: CommitAndPushAllChangesParams) => {
  const changedFiles = await Git.getChangedFiles({ dir });
  const fileChanges = await mapChangedFilesToFileChanges(changedFiles);

  await commitAndPush({
    dir,
    branch,
    messageHeadline,
    messageBody,
    fileChanges,
    updateLocal,
  });
};

interface FileChanges {
  additions: FileAddition[];
  deletions: FileDeletion[];
}

export const mapChangedFilesToFileChanges = async (
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
      contents: await fs.readFile(filePath, {
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

interface CommitAndPushParams {
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
  /**
   * Updates the local git working directory to reflect the new remote state
   */
  updateLocal?: boolean;
}

export const commitAndPush = async ({
  dir,
  branch,
  messageHeadline,
  messageBody,
  fileChanges,
  updateLocal = false,
}: CommitAndPushParams) => {
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

  await graphql<CreateCommitResult>(
    `
      mutation Mutation($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            id
          }
        }
      }
    `,
    {
      input,
      headers: {
        authorization: `bearer ${apiTokenFromEnvironment() || ''}`,
      },
    },
  );

  if (updateLocal) {
    const changedFiles = await Git.getChangedFiles({ dir });
    await Promise.all(changedFiles.map((file) => fs.rm(file.path)));

    await Git.fastForwardBranch({
      ref: branch,
      auth: { type: 'gitHubApp' },
      dir,
    });
  }
};

commitAndPushAllChanges({
  dir: process.cwd(),
  branch: 'graphql-commit',
  messageHeadline: 'change update local logic',
  updateLocal: true,
}).catch(console.error);
