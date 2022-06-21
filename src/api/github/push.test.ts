import { graphql } from '@octokit/graphql';
import type { FileChanges } from '@octokit/graphql-schema';
import fs from 'fs-extra';
import type { ReadCommitResult } from 'isomorphic-git';
import git from 'isomorphic-git';

import { apiTokenFromEnvironment } from './environment';
import { pushAllFileChanges, pushFileChanges, readFileChanges } from './push';

jest.mock('@octokit/graphql');
jest.mock('isomorphic-git');
jest.mock('./environment');
jest.mock('fs-extra');

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

describe('pushFileChanges', () => {
  it('should throw an error if it cannot resolve an API token', async () => {
    await expect(
      pushFileChanges({
        dir: './',
        branch: 'some-branch',
        fileChanges: {
          additions: [],
          deletions: [],
        },
        messageHeadline: 'commit headline',
        messageBody: 'commit body',
      }),
    ).rejects.toThrowError(
      'Could not determine API token from the environment',
    );
  });

  it('should return a commit id', async () => {
    jest.mocked(apiTokenFromEnvironment).mockReturnValue('api-token');
    jest.mocked(graphql).mockResolvedValue({
      createCommitOnBranch: {
        commit: {
          oid: 'upstream-id',
        },
      },
    });

    const result = await pushFileChanges({
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
      Array [
        "
            mutation Mutation($input: CreateCommitOnBranchInput!) {
              createCommitOnBranch(input: $input) {
                commit {
                  oid
                }
              }
            }
          ",
        Object {
          "headers": Object {
            "authorization": "bearer api-token",
          },
          "input": Object {
            "branch": Object {
              "branchName": "existing-branch",
              "repositoryNameWithOwner": "seek-oss/skuba",
            },
            "clientMutationId": "skuba",
            "expectedHeadOid": "commit-id",
            "fileChanges": Object {
              "additions": Array [
                Object {
                  "contents": "",
                  "path": "another-path",
                },
              ],
              "deletions": Array [
                Object {
                  "path": "some-path",
                },
              ],
            },
            "message": Object {
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
    const result = await readFileChanges([
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

    expect(fs.promises.readFile).toBeCalledWith('some-path', {
      encoding: 'base64',
    });
    expect(fs.promises.readFile).toBeCalledWith('another-path', {
      encoding: 'base64',
    });
    expect(result).toStrictEqual(expectedFileChanges);
  });
});

describe('pushAllFileChanges', () => {
  it('should return undefined if there are no file changes to commit', async () => {
    jest.mocked(apiTokenFromEnvironment).mockReturnValue('api-token');
    jest
      .mocked(git.statusMatrix)
      .mockResolvedValue([['unchanged-file', 1, 1, 1]]);

    const result = await pushAllFileChanges({
      dir: './',
      branch: 'existing-branch',
      messageHeadline: 'commit headline',
      messageBody: 'commit body',
    });

    expect(result).toBeUndefined();
  });
  it('should get all modified files and call the graphql client with the changed files', async () => {
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

    await pushAllFileChanges({
      dir: './',
      branch: 'existing-branch',
      messageHeadline: 'commit headline',
      messageBody: 'commit body',
    });

    expect(jest.mocked(graphql).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "
            mutation Mutation($input: CreateCommitOnBranchInput!) {
              createCommitOnBranch(input: $input) {
                commit {
                  oid
                }
              }
            }
          ",
        Object {
          "headers": Object {
            "authorization": "bearer api-token",
          },
          "input": Object {
            "branch": Object {
              "branchName": "existing-branch",
              "repositoryNameWithOwner": "seek-oss/skuba",
            },
            "clientMutationId": "skuba",
            "expectedHeadOid": "commit-id",
            "fileChanges": Object {
              "additions": Array [
                Object {
                  "contents": "base64-contents",
                  "path": "modified-file",
                },
                Object {
                  "contents": "base64-contents",
                  "path": "new-file",
                },
              ],
              "deletions": Array [
                Object {
                  "path": "deleted-file",
                },
              ],
            },
            "message": Object {
              "body": "commit body",
              "headline": "commit headline",
            },
          },
        },
      ]
    `);
  });

  it('should update the local git repository with changes from upstream when updateLocal is set', async () => {
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

    await pushAllFileChanges({
      dir: './',
      branch: 'existing-branch',
      messageHeadline: 'commit headline',
      messageBody: 'commit body',
      updateLocal: true,
    });

    expect(fs.rm).toBeCalledWith('modified-file');
    expect(fs.rm).toBeCalledWith('new-file');
    expect(fs.rm).toBeCalledWith('deleted-file');

    expect(git.fastForward).toBeCalledWith(
      expect.objectContaining({
        ref: 'existing-branch',
        dir: './',
      }),
    );
  });
});
