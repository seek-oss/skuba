import type { FileChanges } from '@octokit/graphql-schema' with { 'resolution-mode': 'import' };
import fs from 'fs-extra';
import type { ReadCommitResult } from 'isomorphic-git' with { 'resolution-mode': 'import' };
import type Git from 'isomorphic-git' with { 'resolution-mode': 'import' };

import { apiTokenFromEnvironment } from './environment';
import { graphql } from './octokit';
import {
  readFileChanges,
  uploadAllFileChanges,
  uploadFileChanges,
} from './push';

jest.mock('./environment');
jest.mock('./octokit');
jest.mock('fs-extra');
jest.mock('isomorphic-git');

const git = jest.requireMock<typeof Git>('isomorphic-git');

beforeAll(() => {
  process.env.BUILDKITE_COMMIT = 'commit-id';
});

afterAll(() => {
  delete process.env.BUILDKITE_COMMIT;
});

afterEach(() => {
  jest.resetAllMocks();
});

beforeEach(() => {
  jest
    .mocked(git.listRemotes)
    .mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);
  jest
    .mocked(git.log)
    .mockResolvedValue([{ oid: 'commit-id' } as ReadCommitResult]);
});

describe('uploadFileChanges', () => {
  it('should throw an error if it cannot resolve an API token', async () => {
    await expect(
      uploadFileChanges({
        dir: './',
        branch: 'some-branch',
        fileChanges: {
          additions: [],
          deletions: [],
        },
        messageHeadline: 'commit headline',
        messageBody: 'commit body',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not read a GitHub API token from the environment. Please set GITHUB_API_TOKEN or GITHUB_TOKEN."`,
    );
  });

  it('should return a commit ID', async () => {
    jest.mocked(apiTokenFromEnvironment).mockReturnValue('api-token');
    jest.mocked(graphql).mockResolvedValue({
      createCommitOnBranch: {
        commit: {
          oid: 'upstream-id',
        },
      },
    });

    const result = await uploadFileChanges({
      dir: './',
      branch: 'existing-branch',
      fileChanges: {
        additions: [{ contents: '', path: 'another-path' }],
        deletions: [{ path: 'some-path' }],
      },
      messageHeadline: 'commit headline',
      messageBody: 'commit body',
    });

    expect(jest.mocked(graphql).mock.calls[0]).toMatchInlineSnapshot(`
      [
        "
            mutation Mutation($input: CreateCommitOnBranchInput!) {
              createCommitOnBranch(input: $input) {
                commit {
                  oid
                }
              }
            }
          ",
        {
          "headers": {
            "authorization": "Bearer api-token",
          },
          "input": {
            "branch": {
              "branchName": "existing-branch",
              "repositoryNameWithOwner": "seek-oss/skuba",
            },
            "clientMutationId": "skuba",
            "expectedHeadOid": "commit-id",
            "fileChanges": {
              "additions": [
                {
                  "contents": "",
                  "path": "another-path",
                },
              ],
              "deletions": [
                {
                  "path": "some-path",
                },
              ],
            },
            "message": {
              "body": "commit body",
              "headline": "commit headline",
            },
          },
        },
      ]
    `);
    expect(result).toBe('upstream-id');
  });
});

describe('readFileChanges', () => {
  it('should read modified and added files from the file system', async () => {
    jest.mocked(fs.promises.readFile).mockResolvedValue('base64-contents');
    const result = await readFileChanges('.', [
      { path: 'some-path', state: 'added' },
      { path: 'another-path', state: 'modified' },
      { path: 'delete-path', state: 'deleted' },
    ]);

    const expectedFileChanges: FileChanges = {
      additions: [
        { contents: 'base64-contents', path: 'some-path' },
        { contents: 'base64-contents', path: 'another-path' },
      ],
      deletions: [{ path: 'delete-path' }],
    };

    expect(fs.promises.readFile).toHaveBeenCalledWith('some-path', {
      encoding: 'base64',
    });
    expect(fs.promises.readFile).toHaveBeenCalledWith('another-path', {
      encoding: 'base64',
    });
    expect(result).toStrictEqual(expectedFileChanges);
  });

  it('should support a nested directory', async () => {
    jest.mocked(git.findRoot).mockResolvedValue('/path/to/repo');
    jest.mocked(fs.promises.readFile).mockResolvedValue('base64-contents');

    const result = await readFileChanges('/path/to/repo/packages/package', [
      { path: 'some-path', state: 'added' },
      { path: 'another-path', state: 'modified' },
      { path: 'delete-path', state: 'deleted' },
    ]);

    const expectedFileChanges: FileChanges = {
      additions: [
        { contents: 'base64-contents', path: 'packages/package/some-path' },
        { contents: 'base64-contents', path: 'packages/package/another-path' },
      ],
      deletions: [{ path: 'packages/package/delete-path' }],
    };

    expect(fs.promises.readFile).toHaveBeenCalledWith('some-path', {
      encoding: 'base64',
    });
    expect(fs.promises.readFile).toHaveBeenCalledWith('another-path', {
      encoding: 'base64',
    });
    expect(result).toStrictEqual(expectedFileChanges);
  });
});

describe('uploadAllFileChanges', () => {
  it('should return undefined if there are no file changes to commit', async () => {
    jest.mocked(apiTokenFromEnvironment).mockReturnValue('api-token');
    jest
      .mocked(git.statusMatrix)
      .mockResolvedValue([['unchanged-file', 1, 1, 1]]);

    const result = await uploadAllFileChanges({
      dir: './',
      branch: 'existing-branch',
      messageHeadline: 'commit headline',
      messageBody: 'commit body',
    });

    expect(result).toBeUndefined();
  });

  it('should get all modified files and call the GraphQL client with the changed files', async () => {
    jest.mocked(apiTokenFromEnvironment).mockReturnValue('api-token');
    jest.mocked(fs.promises.readFile).mockResolvedValue('base64-contents');
    jest.mocked(git.statusMatrix).mockResolvedValue([
      ['modified-file', 1, 2, 1],
      ['new-file', 0, 2, 0],
      ['deleted-file', 1, 0, 1],
    ]);
    jest.mocked(graphql).mockResolvedValue({
      createCommitOnBranch: {
        commit: {
          id: 'upstream-id',
        },
      },
    });

    await uploadAllFileChanges({
      dir: './',
      branch: 'existing-branch',
      messageHeadline: 'commit headline',
      messageBody: 'commit body',
    });

    expect(jest.mocked(graphql).mock.calls[0]).toMatchInlineSnapshot(`
      [
        "
            mutation Mutation($input: CreateCommitOnBranchInput!) {
              createCommitOnBranch(input: $input) {
                commit {
                  oid
                }
              }
            }
          ",
        {
          "headers": {
            "authorization": "Bearer api-token",
          },
          "input": {
            "branch": {
              "branchName": "existing-branch",
              "repositoryNameWithOwner": "seek-oss/skuba",
            },
            "clientMutationId": "skuba",
            "expectedHeadOid": "commit-id",
            "fileChanges": {
              "additions": [
                {
                  "contents": "base64-contents",
                  "path": "modified-file",
                },
                {
                  "contents": "base64-contents",
                  "path": "new-file",
                },
              ],
              "deletions": [
                {
                  "path": "deleted-file",
                },
              ],
            },
            "message": {
              "body": "commit body",
              "headline": "commit headline",
            },
          },
        },
      ]
    `);
  });

  it('should update the local Git repository with changes from upstream when updateLocal is set', async () => {
    jest.mocked(apiTokenFromEnvironment).mockReturnValue('api-token');
    jest.mocked(fs.promises.readFile).mockResolvedValue('base64-contents');
    jest.mocked(git.statusMatrix).mockResolvedValue([
      ['modified-file', 1, 2, 1],
      ['new-file', 0, 2, 0],
      ['deleted-file', 1, 0, 1],
    ]);
    jest.mocked(graphql).mockResolvedValue({
      createCommitOnBranch: {
        commit: {
          id: 'upstream-id',
        },
      },
    });

    await uploadAllFileChanges({
      dir: './',
      branch: 'existing-branch',
      messageHeadline: 'commit headline',
      messageBody: 'commit body',
      updateLocal: true,
    });

    expect(fs.rm).toHaveBeenCalledWith('modified-file');
    expect(fs.rm).toHaveBeenCalledWith('new-file');
    expect(fs.rm).toHaveBeenCalledWith('deleted-file');

    expect(git.fastForward).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'existing-branch',
        dir: './',
      }),
    );
  });
});
