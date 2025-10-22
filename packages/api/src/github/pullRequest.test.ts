import git from 'isomorphic-git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRestClient } from './octokit.js';
import { getPullRequestNumber } from './pullRequest.js';

vi.mock('isomorphic-git');
vi.mock('./octokit');

const mockClient = {
  repos: {
    listPullRequestsAssociatedWithCommit: vi.fn(),
  },
};

beforeEach(() =>
  vi.mocked(createRestClient).mockResolvedValue(mockClient as never),
);

afterEach(vi.resetAllMocks);

describe('getPullRequestNumber', () => {
  it('prefers a Buildkite environment variable', async () => {
    await expect(
      getPullRequestNumber({ env: { BUILDKITE_PULL_REQUEST: '123' } }),
    ).resolves.toBe(123);

    expect(createRestClient).not.toHaveBeenCalled();
  });

  it('prefers a GitHub Actions environment variable', async () => {
    await expect(
      getPullRequestNumber({ env: { GITHUB_REF: 'refs/pull/456/merge' } }),
    ).resolves.toBe(456);

    expect(createRestClient).not.toHaveBeenCalled();
  });

  it('falls back to the most recently updated pull request from the GitHub API', async () => {
    vi.mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    vi.mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    mockClient.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          created_at: new Date(0).toISOString(),
          locked: false,
          number: 1,
          state: 'open',
          updated_at: new Date(0).toISOString(),
        },
        {
          created_at: new Date(0).toISOString(),
          locked: false,
          number: 2,
          state: 'open',
          updated_at: new Date(1).toISOString(),
        },
        {
          created_at: new Date(1).toISOString(),
          locked: false,
          number: 3,
          state: 'open',
          updated_at: new Date(0).toISOString(),
        },
        {
          created_at: new Date(2).toISOString(),
          locked: false,
          number: 4,
          state: 'closed',
          updated_at: new Date(2).toISOString(),
        },
        {
          created_at: new Date(2).toISOString(),
          locked: true,
          number: 5,
          state: 'open',
          updated_at: new Date(2).toISOString(),
        },
      ],
    });

    await expect(getPullRequestNumber({ env: {} })).resolves.toBe(2);

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

    expect(createRestClient).toHaveBeenCalledTimes(1);
  });

  it('throws on an empty response from the GitHub API', async () => {
    vi.mocked(git.log).mockResolvedValue([{ oid: 'commit-id' }] as never);
    vi.mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    mockClient.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [],
    });

    await expect(
      getPullRequestNumber({ env: {} }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Commit commit-id is not associated with an open GitHub pull request"`,
    );
  });
});
