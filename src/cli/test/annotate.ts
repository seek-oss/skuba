import * as Buildkite from '@skuba-lib/api/buildkite';
import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

import { log } from '../../utils/logging.js';

export const createGitHubAnnotations = async (isOk: boolean) => {
  if (!GitHub.enabledFromEnvironment()) {
    return;
  }

  if (!(await Git.findRoot({ dir: process.cwd() }))) {
    log.warn('GitHub annotations skipped because no .git directory was found.');
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

const createBuildkiteAnnotations = async (isOk: boolean) => {
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
