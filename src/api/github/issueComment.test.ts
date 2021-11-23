import { Octokit } from '@octokit/rest';
import git from 'isomorphic-git';
import { mocked } from 'ts-jest/utils';

import { putIssueComment } from './issueComment';

jest.mock('@octokit/rest');
jest.mock('isomorphic-git');

const mockClient = {
  issues: {
    createComment: jest.fn(),
    listComments: jest.fn(),
    updateComment: jest.fn(),
  },
  repos: {
    listPullRequestsAssociatedWithCommit: jest.fn(),
  },
  users: {
    getAuthenticated: jest.fn(),
  },
};

beforeEach(() => {
  mocked(git.listRemotes).mockResolvedValue([
    { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
  ]);

  mocked(Octokit).mockReturnValue(mockClient as never);
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

    expect(Octokit).toHaveBeenCalledTimes(1);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      Object {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.createComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      Object {
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
          closed_at: null,
          created_at: new Date(0).toISOString(),
          number: 123,
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

    mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    await expect(
      putIssueComment({
        body: 'Commentary!',
        // Exercise Git calls when there are no environment variables present.
        env: {},
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(Octokit).toHaveBeenCalledTimes(1);

    expect(mockClient.users.getAuthenticated).toHaveBeenCalledTimes(1);

    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockClient.repos.listPullRequestsAssociatedWithCommit.mock.calls[0][0],
    ).toMatchInlineSnapshot(`
      Object {
        "commit_sha": "commit-id",
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      Object {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.createComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.createComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      Object {
        "body": "Commentary!",
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).not.toHaveBeenCalled();
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

    mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    await expect(
      putIssueComment({
        body: 'Commentary!',
        // Exercise environment variable short circuiting.
        env: { BUILDKITE_PULL_REQUEST: '123' },
      }),
    ).resolves.toStrictEqual({ id: 789 });

    expect(Octokit).toHaveBeenCalledTimes(1);

    expect(mockClient.users.getAuthenticated).toHaveBeenCalledTimes(1);

    expect(mockClient.issues.listComments).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.listComments.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      Object {
        "issue_number": 123,
        "owner": "seek-oss",
        "repo": "skuba",
      }
    `);

    expect(mockClient.issues.updateComment).toHaveBeenCalledTimes(1);
    expect(mockClient.issues.updateComment.mock.calls[0][0])
      .toMatchInlineSnapshot(`
      Object {
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
});
