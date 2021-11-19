import fs from 'fs-extra';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

// Status Matrix Row Indexes
const FILEPATH = 0;
const HEAD = 1;
const WORKDIR = 2;
const STAGE = 3;

// Status Matrix State
const UNCHANGED = 1;

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
  force?: boolean;
}

export const gitPush = async ({
  auth,
  branch,
  commitOid,
  dir,
  force,
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
    force,
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

export const getCurrentBranchRef = async (dir: string): Promise<string> => {
  const branch = await git.currentBranch({
    fs,
    dir,
    fullname: true,
  });

  if (!branch) {
    throw new Error('Could not find the current branch');
  }

  return branch;
};

export const gitBranch = async ({
  dir,
  ref,
  checkout,
}: {
  dir: string;
  ref: string;
  checkout?: boolean;
}): Promise<void> => {
  await git.branch({
    fs,
    dir,
    ref,
    checkout,
  });
};

export const gitDeleteBranch = async ({
  dir,
  ref,
}: {
  dir: string;
  ref: string;
}): Promise<void> => {
  await git.deleteBranch({
    fs,
    dir,
    ref,
  });
};

export const setGitUser = async ({
  dir,
  name,
  email,
}: {
  dir: string;
  name: string;
  email: string;
}): Promise<void> => {
  await Promise.all([
    git.setConfig({ fs, dir, path: 'user.name', value: name }),
    git.setConfig({ fs, dir, path: 'user.email', value: email }),
  ]);
};

export const gitListTags = async ({
  dir,
}: {
  dir: string;
}): Promise<string[]> =>
  git.listTags({
    fs,
    dir,
  });

/**
 * Returns file paths of files which are changed
 */

export const getChangedFiles = async ({
  dir,
}: {
  dir: string;
}): Promise<string[]> => {
  const allFiles = await git.statusMatrix({ fs, dir });
  return allFiles
    .filter(
      (row) =>
        row[HEAD] !== UNCHANGED ||
        row[WORKDIR] !== UNCHANGED ||
        row[STAGE] !== UNCHANGED,
    )
    .map((row) => row[FILEPATH]);
};

export const gitAdd = async ({
  dir,
  filepath,
}: {
  dir: string;
  filepath: string;
}): Promise<void> => {
  await git.add({ fs, dir, filepath });
};

export const gitReset = async ({
  dir,
  branch,
  commitOid,
  hard,
}: {
  dir: string;
  branch: string;
  commitOid: string;
  hard: boolean;
}): Promise<void> => {
  await fs.promises.writeFile(
    `${dir}/.git/refs/heads/${branch}`,
    `${commitOid}\n`,
  );

  if (hard) {
    const allFiles = await git.statusMatrix({ dir, fs });
    // Get all files which have been modified or staged - does not include new untracked files or deleted files
    const modifiedFiles = allFiles
      .filter((row) => row[WORKDIR] > UNCHANGED && row[STAGE] > UNCHANGED)
      .map((row) => row[FILEPATH]);

    // Delete modified/staged files
    await Promise.all(modifiedFiles.map((path) => fs.promises.rm(path)));

    await git.checkout({ dir, fs, ref: branch, force: true });
  }
};
