import { Octokit } from '@octokit/rest';

import * as Git from '../git';

import { apiTokenFromEnvironment } from './environment';

interface GetPullRequestNumberParameters {
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
  params: GetPullRequestNumberParameters = {},
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
    params.client ?? new Octokit({ auth: apiTokenFromEnvironment() });

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

  if (!data.length) {
    throw new Error(
      `Commit ${commitId} is not associated with an open GitHub pull request`,
    );
  }

  return data[0].number;
};

interface GetPullRequestByBranchesParameters {
  /**
   * Head branch for the PR
   */
  head: string;
  /**
   * Base branch for the PR
   */
  base: string;
}

export const getPullRequestNumberByBranches = async (
  params: GetPullRequestByBranchesParameters,
): Promise<number | undefined> => {
  const dir = process.cwd();

  const { owner, repo } = await Git.getOwnerAndRepo({ dir });

  const client = new Octokit({ auth: apiTokenFromEnvironment() });

  const response = await client.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo}+state:open+head:${params.head}+base:${params.base}`,
  });

  return response.data.items?.[0]?.number;
};

interface UpdatePullRequestParams {
  /**
   * Pull request number
   */
  number: number;
  /**
   * Pull request title
   */
  title: string;
  /**
   * Pull request body
   */
  body: string;
}

export const updatePullRequest = async (
  params: UpdatePullRequestParams,
): Promise<PullRequestDetails> => {
  const dir = process.cwd();

  const { owner, repo } = await Git.getOwnerAndRepo({ dir });

  const client = new Octokit({ auth: apiTokenFromEnvironment() });

  const response = await client.pulls.update({
    pull_number: params.number,
    title: params.title,
    body: params.body,
    owner,
    repo,
  });

  return {
    number: response.data.number,
    url: response.data.url,
  };
};

interface CreatePullRequestParams {
  /**
   * Base branch for the PR
   */
  base: string;
  /**
   * Head branch for the PR
   */
  head: string;
  /**
   * The title of the PR
   */
  title: string;
  /**
   * The body of the PR
   */
  body: string;
}

export interface PullRequestDetails {
  number: number;
  url: string;
}

export const createPullRequest = async (
  params: CreatePullRequestParams,
): Promise<PullRequestDetails> => {
  const dir = process.cwd();

  const { owner, repo } = await Git.getOwnerAndRepo({ dir });

  const client = new Octokit({ auth: apiTokenFromEnvironment() });

  const response = await client.pulls.create({
    base: params.base,
    head: params.head,
    title: params.title,
    body: params.body,
    owner,
    repo,
  });

  return {
    number: response.data.number,
    url: response.data.url,
  };
};
