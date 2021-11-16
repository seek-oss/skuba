import { Octokit } from '@octokit/rest';
import { getCurrentBranch, getHeadSha, getOwnerRepo } from 'utils/git';

export const getOctokit = (token: string) => new Octokit({ auth: token });

export const context = async (dir: string) => {
  const [{ owner, repo }, currentBranch, headSha] = await Promise.all([
    getOwnerRepo(dir),
    getCurrentBranch(dir),
    getHeadSha(dir),
  ]);

  return {
    sha: headSha,
    ref: currentBranch,
    repo: {
      repo,
      owner,
    },
  };
};
