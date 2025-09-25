import fs from 'fs-extra';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

import { apiTokenFromEnvironment } from '../github/environment.js';

import { getOwnerAndRepo } from './remote.js';

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
   * The local branch to fast forward.
   */
  ref: string;

  remote?: string;

  /**
   * The branch or tag on the remote to reference.
   *
   * This defaults to `ref`.
   */
  remoteRef?: string;
}

/**
 * Fast forwards the specified `ref` on the local Git repository to match the remote branch.
 */
export const fastForwardBranch = async ({
  auth,
  dir,
  ref,
  remote,
  remoteRef,
}: PullParameters): Promise<void> => {
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
