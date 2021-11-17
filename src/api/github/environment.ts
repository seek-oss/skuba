export const buildNameFromEnvironment = (env = process.env): string => {
  if (env.BUILDKITE_BUILD_NUMBER) {
    return `Build #${env.BUILDKITE_BUILD_NUMBER}`;
  }

  if (env.GITHUB_RUN_NUMBER) {
    return `${env.GITHUB_WORKFLOW ?? 'Build'} #${env.GITHUB_RUN_NUMBER}`;
  }

  return 'Build';
};

export const currentBranchFromEnvironment = (
  env = process.env,
): string | undefined => env.BUILDKITE_BRANCH || env.GITHUB_REF_NAME;

export const enabledFromEnvironment = (env = process.env): boolean =>
  // Running in a CI environment.
  Boolean(env.BUILDKITE || env.CI || env.GITHUB_ACTIONS) &&
  // Has an API token at the ready.
  Boolean(env.GITHUB_API_TOKEN || env.GITHUB_TOKEN);
