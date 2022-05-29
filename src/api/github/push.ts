import fs from 'fs/promises';
import path from 'path';

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
  branch: string;
  messageHeadline: string;
  messageBody?: string;
}

export const commitAndPushAllChanges = async ({
  dir,
  branch,
  messageHeadline,
  messageBody,
}: CommitAndPushAllChangesParams) => {
  const changedFiles = await Git.getChangedFiles({ dir });
  const fileChanges = await mapChangedFilesToFileChanges(dir, changedFiles);

  await commitAndPush({
    dir,
    branch,
    messageHeadline,
    messageBody,
    fileChanges,
  });
};

interface FileChanges {
  additions: FileAddition[];
  deletions: FileDeletion[];
}

export const mapChangedFilesToFileChanges = async (
  dir: string,
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
      contents: await fs.readFile(path.join(dir, filePath), {
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
  branch: string;
  messageHeadline: string;
  messageBody?: string;
  fileChanges: FileChanges;
}

export const commitAndPush = async ({
  dir,
  branch,
  messageHeadline,
  messageBody,
  fileChanges,
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
      body: messageBody ?? null,
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

  // This sets the current working branch to the same state as our remote

  await Git.reset({ branch, commitId: headCommitId, dir, hard: true });

  await Git.pullBranch({ ref: branch, auth: { type: 'gitHubApp' }, dir });
};

commitAndPushAllChanges({
  dir: process.cwd(),
  branch: 'graphql-commit',
  messageHeadline: 'try updating local',
}).catch(console.error);
