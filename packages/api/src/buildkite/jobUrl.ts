/**
 * Returns the URL of the current Buildkite job.
 *
 * This reads `BUILDKITE_BUILD_URL` and, when `BUILDKITE_JOB_ID` is set,
 * anchors the URL to that job. Returns `undefined` when `BUILDKITE_BUILD_URL`
 * is not set.
 */
export const getJobUrl = (env = process.env): string | undefined => {
  const buildUrl = env.BUILDKITE_BUILD_URL;

  if (!buildUrl) {
    return;
  }

  const jobId = env.BUILDKITE_JOB_ID;

  return jobId ? `${buildUrl}#${jobId}` : buildUrl;
};
