import { createHash } from 'node:crypto';

import * as Git from '../git/index.js';

import { getPullRequestNumberFromEnvironment } from './pullRequest.js';

interface GetFileUrlParameters {
  /**
   * GitHub organization or user that owns the repository.
   */
  owner: string;

  /**
   * GitHub repository name.
   */
  repo: string;

  /**
   * Path to the file in the repository, relative to the repository root.
   */
  path: string;

  /**
   * First line to highlight.
   */
  startLine: number;

  /**
   * Last line to highlight.
   *
   * Defaults to `startLine`.
   */
  endLine?: number;

  /**
   * Commit SHA used for a blob permalink.
   *
   * Required when `pullRequestNumber` is omitted.
   */
  commit?: string;

  /**
   * Pull request number used for a files-changed permalink.
   *
   * When set, the URL points at the new side of the pull request diff.
   */
  pullRequestNumber?: number;
}

interface GetFileUrlFromEnvironmentParameters {
  /**
   * Path to the file in the repository, relative to the repository root.
   */
  path: string;

  /**
   * First line to highlight.
   */
  startLine: number;

  /**
   * Last line to highlight.
   *
   * Defaults to `startLine`.
   */
  endLine?: number;

  /**
   * Pull request number used for a files-changed permalink.
   *
   * Defaults to `BUILDKITE_PULL_REQUEST` or the number in `GITHUB_REF`.
   * When set, the URL points at the new side of the pull request diff.
   */
  pullRequestNumber?: number;

  /**
   * Environment variables used to resolve the repository and commit.
   *
   * Defaults to `process.env`.
   */
  env?: Record<string, string | undefined>;
}

const encodeRepoPath = (path: string) =>
  path.split('/').map(encodeURIComponent).join('/');

/**
 * Builds a GitHub permalink to a file and line range.
 *
 * When `pullRequestNumber` is set, this returns a files-changed URL that
 * anchors to the new side of the pull request diff. Otherwise it returns a
 * blob URL at `commit`.
 *
 * Returns `undefined` when a blob URL is requested without a `commit`.
 */
export const getFileUrl = ({
  owner,
  repo,
  path,
  startLine,
  endLine = startLine,
  commit,
  pullRequestNumber,
}: GetFileUrlParameters) => {
  // `R` marks lines on the new side of a pull request diff.
  const side = pullRequestNumber === undefined ? 'L' : 'R';
  const lines =
    startLine === endLine
      ? `${side}${startLine}`
      : `${side}${startLine}-${side}${endLine}`;

  if (pullRequestNumber !== undefined) {
    // GitHub anchors a file in a pull request diff by the SHA-256 of its path.
    const fileHash = createHash('sha256').update(path).digest('hex');

    return `https://github.com/${owner}/${repo}/pull/${pullRequestNumber}/files#diff-${fileHash}${lines}`;
  }

  if (commit) {
    return `https://github.com/${owner}/${repo}/blob/${commit}/${encodeRepoPath(path)}#${lines}`;
  }

  return;
};

/**
 * Builds a GitHub permalink from CI environment variables.
 *
 * This tries `GITHUB_REPOSITORY`, then `BUILDKITE_REPO`, for the owner and
 * repository, `BUILDKITE_COMMIT` or `GITHUB_SHA` for the commit, and
 * `BUILDKITE_PULL_REQUEST` or `GITHUB_REF` for the pull request.
 *
 * When a pull request number is available, this returns a files-changed URL
 * that anchors to the new side of the pull request diff.
 *
 * Returns `undefined` when the repository cannot be resolved, or when a blob
 * URL is requested without a commit.
 */
export const getFileUrlFromEnvironment = ({
  path,
  startLine,
  endLine,
  pullRequestNumber,
  env = process.env,
}: GetFileUrlFromEnvironmentParameters) => {
  const ownerAndRepo =
    Git.getOwnerAndRepoFromUrl(env.GITHUB_REPOSITORY ?? '') ??
    Git.getOwnerAndRepoFromUrl(env.BUILDKITE_REPO ?? '');

  if (!ownerAndRepo) {
    return;
  }

  return getFileUrl({
    ...ownerAndRepo,
    path,
    startLine,
    endLine,
    pullRequestNumber:
      pullRequestNumber ?? getPullRequestNumberFromEnvironment(env),
    commit: env.BUILDKITE_COMMIT ?? env.GITHUB_SHA,
  });
};
