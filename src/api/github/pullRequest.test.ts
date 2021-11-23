import { Octokit } from '@octokit/rest';
import git from 'isomorphic-git';
import { mocked } from 'ts-jest/utils';

import { getPullRequest } from './pullRequest';

jest.mock('@octokit/rest');
jest.mock('isomorphic-git');

const mockClient = {
  repos: {
    listPullRequestsAssociatedWithCommit: jest.fn(),
  },
};

beforeEach(() => mocked(Octokit).mockReturnValue(mockClient as never));

afterEach(jest.resetAllMocks);

describe('getPullRequest', () => {
  it('prefers a Buildkite environment variable', async () => {
    await expect(
      getPullRequest({ env: { BUILDKITE_PULL_REQUEST: '123' } }),
    ).resolves.toStrictEqual({ number: 123 });

    expect(Octokit).not.toHaveBeenCalled();
  });

  it('prefers a GitHub Actions environment variable', async () => {
    await expect(
      getPullRequest({ env: { GITHUB_REF: 'refs/pull/456/merge' } }),
    ).resolves.toStrictEqual({ number: 456 });

    expect(Octokit).not.toHaveBeenCalled();
  });

  it('falls back to the most recently updated pull request from the GitHub API', async () => {
    mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    mockClient.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          closed_at: null,
          created_at: new Date(0).toISOString(),
          number: 1,
          updated_at: new Date(0).toISOString(),
        },
        {
          closed_at: null,
          created_at: new Date(0).toISOString(),
          number: 2,
          updated_at: new Date(1).toISOString(),
        },
        {
          closed_at: null,
          created_at: new Date(1).toISOString(),
          number: 3,
          updated_at: new Date(0).toISOString(),
        },
        {
          closed_at: new Date(2).toISOString(),
          created_at: new Date(2).toISOString(),
          number: 4,
          updated_at: new Date(2).toISOString(),
        },
      ],
    });

    await expect(getPullRequest({ env: {} })).resolves.toStrictEqual({
      number: 2,
    });

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

    expect(Octokit).toHaveBeenCalledTimes(1);
  });

  it('throws on an empty response from the GitHub API', async () => {
    mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    mockClient.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [],
    });

    await expect(
      getPullRequest({ env: {} }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Commit commit-id is not associated with a GitHub pull request"`,
    );
  });
});
