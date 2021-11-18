import { Octokit } from '@octokit/rest';

import { currentBranchFromEnvironment } from '../../api/github/environment';
import { getCurrentBranchRef, getHeadSha, getOwnerRepo } from '../../utils/git';

export { Octokit };

export const getOctokit = (token: string) => new Octokit({ auth: token });

export const context = async (dir: string) => {
  const [{ owner, repo }, currentBranchRef, headSha] = await Promise.all([
    getOwnerRepo(dir),
    currentBranchFromEnvironment() || getCurrentBranchRef(dir),
    getHeadSha(dir),
  ]);

  return {
    sha: headSha,
    ref: currentBranchRef,
    repo: {
      repo,
      owner,
    },
  };
};
