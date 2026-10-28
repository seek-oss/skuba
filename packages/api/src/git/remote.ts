import fs from 'fs-extra';
import git from 'isomorphic-git';

/**
 * Matches the owner and repository names in a GitHub repository URL.
 *
 * For example, given the following input strings:
 *
 * ```console
 * git@github.com:seek-oss/skuba.git
 * https://github.com/seek-oss/skuba.git
 * https://github.com/seek-oss/skuba
 * seek-oss/skuba
 * ```
 *
 * This pattern will produce the following matches:
 *
 * 1. seek-oss
 * 2. skuba
 */
const ownerRepoRegex =
  /(?:github\.com[:\/]|^)([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?$/;

/**
 * Parses a GitHub repository URL or `owner/repo` slug into its owner and
 * repository names.
 *
 * Currently, only GitHub repository URLs and slugs are supported:
 *
 * ```console
 * git@github.com:seek-oss/skuba.git
 * https://github.com/seek-oss/skuba.git
 * https://github.com/seek-oss/skuba
 * seek-oss/skuba
 * ```
 *
 * Returns `undefined` when the input is not a recognised GitHub repository.
 * Leading and trailing whitespace is ignored.
 */
export const getOwnerAndRepoFromUrl = (url: string) => {
  const match = ownerRepoRegex.exec(url.trim());

  const owner = match?.[1];
  const repo = match?.[2];

  return owner && repo ? { owner, repo } : undefined;
};

interface GetOwnerAndRepoParameters {
  dir: string;
  env?: Record<string, string | undefined>;
}

/**
 * Extracts the owner and repository names from CI environment variables,
 * falling back to local Git remotes.
 *
 * Currently, only GitHub repository URLs and slugs are supported:
 *
 * ```console
 * git@github.com:seek-oss/skuba.git
 * https://github.com/seek-oss/skuba.git
 * https://github.com/seek-oss/skuba
 * seek-oss/skuba
 * ```
 */
export const getOwnerAndRepo = async ({
  dir,
  env = process.env,
}: GetOwnerAndRepoParameters): Promise<{ owner: string; repo: string }> => {
  const fromEnvironment =
    getOwnerAndRepoFromUrl(env.GITHUB_REPOSITORY ?? '') ??
    getOwnerAndRepoFromUrl(env.BUILDKITE_REPO ?? '');

  if (fromEnvironment) {
    return fromEnvironment;
  }

  const gitRoot = await git.findRoot({ filepath: dir, fs });

  const remotes = await git.listRemotes({ dir: gitRoot, fs });

  for (const { url } of remotes) {
    const fromRemote = getOwnerAndRepoFromUrl(url);

    if (fromRemote) {
      return fromRemote;
    }
  }

  throw new Error('Could not find a GitHub remote');
};
