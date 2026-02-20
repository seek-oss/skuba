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
 * ```
 *
 * This pattern will produce the following matches:
 *
 * 1. seek-oss
 * 2. skuba
 */
const ownerRepoRegex = /github\.com(?::|\/)([^/]+)\/([^/]+)\.git$/;

const ownerAndRepoFromUrl = (url: string) => {
  const match = ownerRepoRegex.exec(url);

  const owner = match?.[1];
  const repo = match?.[2];

  return { owner, repo };
};

interface GetOwnerAndRepoParameters {
  dir: string;
  env?: Record<string, string | undefined>;
}

/**
 * Extracts the owner and repository names from CI environment variables,
 * falling back to local Git remotes.
 *
 * Currently, only GitHub repository URLs are supported:
 *
 * ```console
 * git@github.com:seek-oss/skuba.git
 * https://github.com/seek-oss/skuba.git
 * ```
 */
export const getOwnerAndRepo = async ({
  dir,
  env = process.env,
}: GetOwnerAndRepoParameters): Promise<{ owner: string; repo: string }> => {
  if (env.GITHUB_REPOSITORY) {
    const [owner, repo] = env.GITHUB_REPOSITORY.split('/');

    if (owner && repo) {
      return { owner, repo };
    }
  }

  if (env.BUILDKITE_REPO) {
    const { owner, repo } = ownerAndRepoFromUrl(env.BUILDKITE_REPO);

    if (owner && repo) {
      return { owner, repo };
    }
  }

  const gitRoot = await git.findRoot({ filepath: dir, fs });

  const remotes = await git.listRemotes({ dir: gitRoot, fs });

  for (const { url } of remotes) {
    const { owner, repo } = ownerAndRepoFromUrl(url);

    if (owner && repo) {
      return { owner, repo };
    }
  }

  throw new Error('Could not find a GitHub remote');
};
