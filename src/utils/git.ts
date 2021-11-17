import fs from 'fs-extra';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

export const gitCommit = async ({
  dir,
  message,
}: {
  dir: string;
  message: string;
}) =>
  git.commit({
    author: { name: 'skuba' },
    committer: { name: 'skuba' },
    dir,
    fs,
    message,
  });

interface GitPushProps {
  auth: { type: 'gitHubApp'; token: string };
  branch: string;
  commitOid: string;
  dir: string;
}

export const gitPush = async ({
  auth,
  branch,
  commitOid,
  dir,
}: GitPushProps) => {
  const { owner, repo } = await getOwnerRepo(dir);

  const url = `https://github.com/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}`;

  return git.push({
    onAuth: () => ({
      username: 'x-access-token',
      password: auth.token,
    }),
    http,
    dir,
    fs,
    ref: commitOid,
    remoteRef: branch,
    url,
  });
};

export const getHeadSha = async (dir: string): Promise<string> => {
  const [commit] = await git.log({ depth: 1, dir, fs });

  return commit.oid;
};

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
const ownerRepoRegex = /github.com(?::|\/)(.+)\/(.+).git$/;

export const getOwnerRepo = async (
  dir: string,
): Promise<{ owner: string; repo: string }> => {
  const remotes = await git.listRemotes({ dir, fs });

  for (const { url } of remotes) {
    const match = ownerRepoRegex.exec(url);

    const owner = match?.[1];
    const repo = match?.[2];

    if (owner && repo) {
      return { owner, repo };
    }
  }

  throw new Error('Could not find a GitHub remote');
};
