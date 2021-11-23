import { Octokit } from '@octokit/rest';

import * as Git from '../git';

interface GetPullRequestParameters {
  /**
   * A preconstructed Octokit client to interact with GitHub's APIs.
   *
   * A `GITHUB_API_TOKEN` or `GITHUB_TOKEN` with write permissions must be
   * present on the environment if this is not provided.
   */
  client?: Octokit;
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
export const getPullRequest = async (
  params: GetPullRequestParameters = {},
): Promise<PullRequest> => {
  const dir = process.cwd();

  {
    const number = Number(
      process.env.BUILDKITE_PULL_REQUEST ??
        process.env.GITHUB_REF?.replace(/^refs\/pull\/(\d+)/, '$1'),
    );

    if (Number.isSafeInteger(number)) {
      return { number };
    }
  }

  const client =
    params.client ??
    new Octokit({
      auth: process.env.GITHUB_API_TOKEN ?? process.env.GITHUB_TOKEN,
    });

  const [commitId, { owner, repo }] = await Promise.all([
    Git.getHeadCommitId({ dir }),
    Git.getOwnerAndRepo({ dir }),
  ]);

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
