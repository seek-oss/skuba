import * as Buildkite from '@skuba-lib/api/buildkite';
import * as GitHub from '@skuba-lib/api/github';

export const createGitHubAnnotations = async (isOk: boolean) => {
  if (!GitHub.enabledFromEnvironment()) {
    return;
  }

  const build = GitHub.buildNameFromEnvironment();

  const summary = isOk
  ? '`skuba test` passed.'
  : '`skuba test` found issues that require triage.';

  await GitHub.createCheckRun({
    name: 'skuba/test',
    summary,
    annotations: [],
    conclusion: isOk ? 'success' : 'failure',
    title: `${build} ${isOk ? 'passed' : 'failed'}`,
  });
};

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

export const createAnnotations = async (isOk: boolean) => {
  await Promise.all([
    createGitHubAnnotations(isOk),
    createBuildkiteAnnotations(isOk),
  ]);
};