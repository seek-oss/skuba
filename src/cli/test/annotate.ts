import * as Buildkite from '@skuba-lib/api/buildkite';

export const createBuildkiteAnnotations = async (isOk: boolean) => {
  if (isOk) {
    return;
  }

  const buildkiteOutput = [
    '`skuba test` found issues that require triage:',
  ].join('\n\n');

  await Buildkite.annotate(buildkiteOutput, {
    context: 'skuba-test',
    scopeContextToStep: true,
    style: 'error',
  });
};

/**
 * Annotates test results on supported CI providers.
 *
 * GitHub check runs are reported from within Vitest by our `GitHubReporter`,
 * which has access to individual test failures.
 */
export const createAnnotations = async (isOk: boolean) => {
  await createBuildkiteAnnotations(isOk);
};
