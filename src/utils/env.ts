/**
 * Whether the code is executing in a CI environment.
 */
export const isCiEnv = (env = process.env): boolean =>
  Boolean(env.BUILDKITE || env.CI || env.GITHUB_ACTIONS);
