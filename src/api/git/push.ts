import fs from 'fs-extra';

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

interface PushParameters {
  /**
   * The auth mechanism for the push.
   *
   * Currently, only GitHub app tokens are supported.
   */
  auth: GitHubAppAuth;

  dir: string;

  /**
   * The reference to push to the remote.
   *
   * This may be a commit, branch or tag in the local repository.
   */
  ref: string;

  remote?: string;

  /**
   * The destination branch or tag on the remote.
   *
   * This defaults to `ref`.
   */
  remoteRef?: string;

  /**
   * Forcefully override any conflicts.
   *
   * This defaults to `false`.
   */
  force?: boolean;
}

interface PushResult {
  ok: boolean;
  error: string | null;
  refs: Record<
    string,
    {
      ok: boolean;
      error: string;
    }
  >;
  headers?: Record<string, string> | undefined;
}

/**
 * Pushes the specified `ref` from the local Git repository to a remote.
 */
export const push = async ({
  auth,
  dir,
  ref,
  remote,
  remoteRef,
  force,
}: PushParameters): Promise<PushResult> => {
  const { owner, repo } = await getOwnerAndRepo({ dir });

  const url = `https://github.com/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}`;

  const [git, http] = await Promise.all([
    import('isomorphic-git'),
    import('isomorphic-git/http/node'),
  ]);

  return git.push({
    onAuth: () => ({
      username: 'x-access-token',
      password: auth.token ?? apiTokenFromEnvironment(),
    }),
    dir,
    fs,
    http: http.default,
    ref,
    remote,
    remoteRef,
    url,
    force,
  });
};
