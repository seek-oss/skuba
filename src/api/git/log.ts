import fs from 'fs-extra';
import git from 'isomorphic-git';

interface GetHeadCommitParameters {
  dir: string;
  env?: Record<string, string | undefined>;
}

const EMPTY_GIT_LOG_ERROR = new Error('Git log does not contain any commits');

/**
 * Gets the object ID of the head commit.
 *
 * This tries to extract the commit ID from common CI environment variables,
 * and falls back to the local Git repository log.
 */
export const getHeadCommitId = async ({
  dir,
  env = process.env,
}: GetHeadCommitParameters) => {
  const oidFromEnv = env.BUILDKITE_COMMIT ?? env.GITHUB_SHA;

  if (oidFromEnv) {
    return oidFromEnv;
  }

  const [headResult] = await git.log({ depth: 1, dir, fs });

  if (!headResult) {
    throw EMPTY_GIT_LOG_ERROR;
  }

  return headResult.oid;
};

/**
 * Gets the message of the head commit.
 *
 * This tries to extract the message from common CI environment variables,
 * and falls back to the local Git repository log.
 */
export const getHeadCommitMessage = async ({
  dir,
  env = process.env,
}: GetHeadCommitParameters) => {
  const messageFromEnv = env.BUILDKITE_MESSAGE;

  if (messageFromEnv) {
    return messageFromEnv;
  }

  const [headResult] = await git.log({ depth: 1, dir, fs });

  if (!headResult) {
    throw EMPTY_GIT_LOG_ERROR;
  }

  return headResult.commit.message;
};
