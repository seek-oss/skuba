import type Git from 'isomorphic-git' with { 'resolution-mode': 'import' };

import { putIssueComment } from './issueComment';
import { createRestClient } from './octokit';

jest.mock('isomorphic-git');
jest.mock('./octokit');

const git = jest.requireMock<typeof Git>('isomorphic-git');

const mockClient = {
  issues: {
    createComment: jest.fn(),
    listComments: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  },
  repos: {
    listPullRequestsAssociatedWithCommit: jest.fn(),
  },
  users: {
    getAuthenticated: jest.fn(),
  },
};

beforeEach(() => {
  jest
    .mocked(git.listRemotes)
    .mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

  jest.mocked(createRestClient).mockResolvedValue(mockClient as never);
});

afterEach(jest.resetAllMocks);

describe('putIssueComment', () => {
  it('handles explicit issue and user IDs', async () => {
    mockClient.issues.createComment.mockResolvedValue({ data: { id: 789 } });
    mockClient.issues.listComments.mockResolvedValue({ data: [] });

    await expect(
      putIssueComment({
        body: 'Commentary!',
        issueNumber: 123,
        userId: 456,
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(createRestClient).toHaveBeenCalledTimes(1);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.createComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "body": "Commentary!",
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).not.toHaveBeenCalled();
    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit,
    ).not.toHaveBeenCalled();
    expect(mockClient.users.getAuthenticated).not.toHaveBeenCalled();
  });

  it('creates the first comment for the authenticated user', async () => {
    mockClient.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          created_at: new Date(0).toISOString(),
          locked: false,
          number: 123,
          state: 'open',
          updated_at: new Date(0).toISOString(),
        },
      ],
    });
    mockClient.issues.createComment.mockResolvedValue({ data: { id: 789 } });
    mockClient.issues.listComments.mockResolvedValue({
      data: [{ id: 222, user: { id: 222 } }],
    });
    mockClient.users.getAuthenticated.mockResolvedValue({
      data: { id: 111 },
    });

    jest.mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    await expect(
      putIssueComment({
        body: 'Commentary!',
        // Exercise Git calls when there are no environment variables present.
        env: {},
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(createRestClient).toHaveBeenCalledTimes(1);

    expect(mockClient.users.getAuthenticated).toHaveBeenCalledTimes(1);

    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit.mock.calls[0][0],
    ).toMatchInlineSnapshot(`
      {
        "commit_sha": "commit-id",
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.createComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "body": "Commentary!",
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).not.toHaveBeenCalled();
  });

  it('creates a new comment when the internal ID does not match', async () => {
    mockClient.issues.createComment.mockResolvedValue({ data: { id: 789 } });
    mockClient.issues.listComments.mockResolvedValue({
      data: [{ body: 'No internal ID here!', id: 111, user: { id: 111 } }],
    });
    mockClient.users.getAuthenticated.mockResolvedValue({
      data: { id: 111 },
    });

    jest.mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    await expect(
      putIssueComment({
        body: 'Commentary!',
        // Exercise environment variable short circuiting.
        env: { BUILDKITE_PULL_REQUEST: '123' },
        internalId: 'hunter2',
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(createRestClient).toHaveBeenCalledTimes(1);

    expect(mockClient.users.getAuthenticated).toHaveBeenCalledTimes(1);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.createComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "body": "Commentary!

      <!-- hunter2 -->",
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).not.toHaveBeenCalled();
    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit,
    ).not.toHaveBeenCalled();
  });

  it('updates an existing comment from the authenticated user', async () => {
    mockClient.issues.updateComment.mockResolvedValue({ data: { id: 789 } });
    mockClient.issues.listComments.mockResolvedValue({
      data: [
        { id: 222, user: { id: 222 } },
        { id: 111, user: { id: 111 } },
        // This second comment from the authenticated user should be ignored.
        { id: 112, user: { id: 111 } },
      ],
    });
    mockClient.users.getAuthenticated.mockResolvedValue({
      data: { id: 111 },
    });

    jest.mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    await expect(
      putIssueComment({
        body: 'Commentary!',
        // Exercise environment variable short circuiting.
        env: { BUILDKITE_PULL_REQUEST: '123' },
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(createRestClient).toHaveBeenCalledTimes(1);

    expect(mockClient.users.getAuthenticated).toHaveBeenCalledTimes(1);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.updateComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "body": "Commentary!",
        "comment_id": 111,
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).not.toHaveBeenCalled();
    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit,
    ).not.toHaveBeenCalled();
  });

  it('updates an existing comment when the internal ID matches', async () => {
    mockClient.issues.updateComment.mockResolvedValue({ data: { id: 789 } });
    mockClient.issues.listComments.mockResolvedValue({
      data: [
        {
          body: 'Internal ID here!\n\n<!-- hunter2 -->',
          id: 111,
          user: { id: 111 },
        },
      ],
    });
    mockClient.users.getAuthenticated.mockResolvedValue({
      data: { id: 111 },
    });

    jest.mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    await expect(
      putIssueComment({
        body: 'Commentary!',
        // Exercise environment variable short circuiting.
        env: { BUILDKITE_PULL_REQUEST: '123' },
        internalId: 'hunter2',
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(createRestClient).toHaveBeenCalledTimes(1);

    expect(mockClient.users.getAuthenticated).toHaveBeenCalledTimes(1);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.updateComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "body": "Commentary!

      <!-- hunter2 -->",
        "comment_id": 111,
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).not.toHaveBeenCalled();
    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit,
    ).not.toHaveBeenCalled();
  });

  it('updates an existing comment for the seek-build-agency user ID', async () => {
    mockClient.issues.updateComment.mockResolvedValue({ data: { id: 789 } });
    mockClient.issues.listComments.mockResolvedValue({
      data: [{ id: 111, user: { id: 87109344 } }],
    });

    jest.mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    await expect(
      putIssueComment({
        body: 'Commentary!',
        // Exercise environment variable short circuiting.
        env: { BUILDKITE_PULL_REQUEST: '123' },
        userId: 'seek-build-agency',
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(createRestClient).toHaveBeenCalledTimes(1);

    // This should be skipped when `userId` is specified.
    expect(mockClient.users.getAuthenticated).not.toHaveBeenCalled();

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.updateComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "body": "Commentary!",
        "comment_id": 111,
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).not.toHaveBeenCalled();
    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit,
    ).not.toHaveBeenCalled();
  });

  it('refuses to delete a comment if internalId is not provided', async () => {
    await expect(
      putIssueComment({
        body: null,
        env: { BUILDKITE_PULL_REQUEST: '123' },
      }),
    ).rejects.toThrow('Cannot remove comment without an internalId');
  });

  it('returns null when trying to delete a comment that does not exist', async () => {
    mockClient.issues.listComments.mockResolvedValue({
      data: [
        {
          id: 111,
          user: { id: 111 },
          body: 'Commentary! \n\n<!-- the-internal-id -->',
        },
        {
          id: 222,
          user: { id: 87109344 },
          body: 'Commentary! \n\n<!-- not-the-internal-id -->',
        },
      ],
    });

    await expect(
      putIssueComment({
        body: null,
        internalId: 'the-internal-id',
        userId: 'seek-build-agency',
        env: { BUILDKITE_PULL_REQUEST: '123' },
      }),
    ).resolves.toBeNull();

    expect(mockClient.issues.createComment).not.toHaveBeenCalled();
    expect(mockClient.issues.updateComment).not.toHaveBeenCalled();
    expect(mockClient.issues.deleteComment).not.toHaveBeenCalled();
  });

  it('returns null and deletes a comment', async () => {
    mockClient.issues.listComments.mockResolvedValue({
      data: [
        {
          id: 111,
          user: { id: 111 },
          body: 'Commentary! \n\n<!-- the-internal-id -->',
        },
        {
          id: 222,
          user: { id: 87109344 },
          body: 'Commentary! \n\n<!-- the-internal-id -->',
        },
      ],
    });

    await expect(
      putIssueComment({
        body: null,
        internalId: 'the-internal-id',
        userId: 'seek-build-agency',
        env: { BUILDKITE_PULL_REQUEST: '123' },
      }),
    ).resolves.toBeNull();

    expect(mockClient.issues.createComment).not.toHaveBeenCalled();
    expect(mockClient.issues.updateComment).not.toHaveBeenCalled();
    expect(mockClient.issues.deleteComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.deleteComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      {
        "comment_id": 222,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);
  });
});
