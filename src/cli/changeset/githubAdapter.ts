import { Octokit } from '@octokit/rest';

import * as Git from '../../api/git';

export { Octokit };

export const getOctokit = (token: string) => new Octokit({ auth: token });

export const context = async (dir: string) => {
  const [{ owner, repo }, currentBranch, headSha] = await Promise.all([
    Git.getOwnerAndRepo({ dir }),
    Git.currentBranch({ dir }),
    Git.getHeadCommitId({ dir }),
  ]);

  if (!currentBranch) {
    throw new Error(
      'Could not determine the current Git branch from environment variables or local directory',
    );
  }

  return {
    sha: headSha,
    ref: currentBranch,
    repo: {
      repo,
      owner,
    },
  };
};
