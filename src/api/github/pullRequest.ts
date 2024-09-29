import type { Octokit } from '@octokit/rest';

import * as Git from '../git';

import { apiTokenFromEnvironment } from './environment';
import { createRestClient } from './octokit';

interface GetPullRequestParameters {
  /**
   * A preconstructed Octokit client to interact with GitHub's APIs.
   *
   * A `GITHUB_API_TOKEN` or `GITHUB_TOKEN` with write permissions must be
   * present on the environment if this is not provided.
   */
  client?: Octokit;

  env?: Record<string, string | undefined>;
}

/**
 * Gets the number of the current pull request.
 *
 * This tries to extract the pull request from common CI environment variables,
 * and falls back to querying the GitHub Repos API for the latest pull request
 * associated with the head commit. An error is thrown if there are no
 * associated pull requests, or if they are all closed or locked.
 */
export const getPullRequestNumber = async (
  params: GetPullRequestParameters = {},
): Promise<number> => {
  const env = params.env ?? process.env;

  const dir = process.cwd();

  const number = Number(
    env.BUILDKITE_PULL_REQUEST ??
      env.GITHUB_REF?.replace(/^refs\/pull\/(\d+).*$/, '$1'),
  );

  if (Number.isSafeInteger(number)) {
    return number;
  }

  const client =
    params.client ??
    (await createRestClient({ auth: apiTokenFromEnvironment() }));

  const [commitId, { owner, repo }] = await Promise.all([
    Git.getHeadCommitId({ dir, env }),
    Git.getOwnerAndRepo({ dir }),
  ]);

  const response = await client.repos.listPullRequestsAssociatedWithCommit({
    commit_sha: commitId,
    owner,
    repo,
  });

  const data = response.data
    .filter((pr) => pr.state === 'open' && !pr.locked)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const pullRequestData = data[0];
  if (!pullRequestData) {
    throw new Error(
      `Commit ${commitId} is not associated with an open GitHub pull request`,
    );
  }

  return pullRequestData.number;
};
