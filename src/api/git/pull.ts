import fs from 'fs-extra';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

import { apiTokenFromEnvironment } from '../github/environment';

import { getOwnerAndRepo } from './remote';

/**
 * Use a GitHub app token to auth the Git push.
 *
 * This defaults to the `GITHUB_API_TOKEN` and `GITHUB_TOKEN` environment
 * variables if `token` is not provided.
 */
interface GitHubAppAuth {
  type: 'gitHubApp';
  token?: string;
}

interface PullParameters {
  /**
   * The auth mechanism for the push.
   *
   * Currently, only GitHub app tokens are supported.
   */
  auth: GitHubAppAuth;

  dir: string;

  /**
   * The branch to merge into
   */
  ref: string;

  remote?: string;

  /**
   * The destination branch or tag on the remote.
   *
   * This defaults to `ref`.
   */
  remoteRef?: string;
}

/**
 * Pulls the specified `ref` from the remote to local Git repository
 */
export const pullBranch = async ({
  auth,
  dir,
  ref,
  remote,
  remoteRef,
}: PullParameters) => {
  const { owner, repo } = await getOwnerAndRepo({ dir });

  const url = `https://github.com/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}`;

  return git.fastForward({
    onAuth: () => ({
      username: 'x-access-token',
      password: auth.token ?? apiTokenFromEnvironment(),
    }),
    dir,
    fs,
    http,
    ref,
    remote,
    remoteRef,
    url,
    singleBranch: true,
  });
};
