import type { Octokit } from '@octokit/rest';

import { getHeadCommitId } from '../git';

interface GetPullRequestParameters {
  client: Octokit;
  dir: string;
  owner: string;
  repo: string;
}

interface PullRequest {
  number: number;
}

/**
 * Gets the number of the current pull request.
 *
 * This tries to extract the pull request from common CI environment variables,
 * and falls back to querying the GitHub Repos API for the latest pull request
 * associated with the head commit.
 */
export const getPullRequest = async ({
  client,
  dir,
  owner,
  repo,
}: GetPullRequestParameters): Promise<PullRequest> => {
  {
    const number = Number(
      process.env.BUILDKITE_PULL_REQUEST ??
        process.env.GITHUB_REF?.replace(/^refs\/pull\/(\d+)/, '$1'),
    );

    if (Number.isSafeInteger(number)) {
      return { number };
    }
  }

  const commitId = await getHeadCommitId({ dir });

  const { data } = await client.repos.listPullRequestsAssociatedWithCommit({
    commit_sha: commitId,
    owner,
    repo,
  });

  if (!data.length) {
    throw new Error(
      `Commit ${commitId} is not associated with a GitHub pull request`,
    );
  }

  data
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .sort((a, b) => {
      if (a.closed_at && b.closed_at) {
        return 0;
      }

      return a.closed_at ? 1 : -1;
    });

  const { number } = data[0];

  return { number };
};
