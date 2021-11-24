import fs from 'fs-extra';
import git from 'isomorphic-git';

interface GetHeadCommitIdParameters {
  dir: string;
  env?: Record<string, string | undefined>;
}

/**
 * Gets the object ID of the head commit.
 *
 * This tries to extract the commit ID from common CI environment variables,
 * and falls back to the local Git repository log.
 */
export const getHeadCommitId = async ({
  dir,
  env = process.env,
}: GetHeadCommitIdParameters): Promise<string> => {
  const oidFromEnv = env.BUILDKITE_COMMIT ?? env.GITHUB_SHA;

  if (oidFromEnv) {
    return oidFromEnv;
  }

  const [headCommit] = await git.log({ depth: 1, dir, fs });

  if (!headCommit) {
    throw new Error('Git log does not contain any commits');
  }

  return headCommit.oid;
};
