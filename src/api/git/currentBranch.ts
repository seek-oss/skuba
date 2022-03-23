import fs from 'fs-extra';
import git from 'isomorphic-git';

/**
 * Tries to return a Git branch name from CI environment variables.
 */
const currentBranchFromEnvironment = (env = process.env): string | undefined =>
  env.BUILDKITE_BRANCH ?? env.GITHUB_REF_NAME;

interface CurrentBranchParameters {
  dir?: string;
  env?: Record<string, string | undefined>;
}

/**
 * Tries to return a Git branch name from CI environment variables, falling back
 * to the local Git repository when the current working `dir` is supplied.
 */
export const currentBranch = async ({
  dir,
  env = process.env,
}: CurrentBranchParameters = {}): Promise<string | undefined> => {
  const fromEnv = currentBranchFromEnvironment(env);

  if (fromEnv) {
    return fromEnv;
  }

  if (!dir) {
    return;
  }

  const fromRepo = await git.currentBranch({
    dir,
    fs,
  });

  return fromRepo ?? undefined;
};
