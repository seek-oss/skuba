import { Github } from '../../../..';
import { ESLintOutput } from '../../../../cli/adapter/eslint';
import { PrettierOutput } from '../../../../cli/adapter/prettier';
import { StreamInterceptor } from '../../../../cli/lint/external';
import { log } from '../../../../utils/logging';

import { createEslintAnnotations } from './eslint';
import { createPrettierAnnotations } from './prettier';
import { createTscAnnotations } from './tsc';

const createGitHubAnnotations = async (
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
  summary: string,
) => {
  if (!Github.isGithubAnnotationsEnabled()) {
    return;
  }
  log.plain('Sending annotations to Github');

  const annotations: Github.Annotation[] = [
    ...createEslintAnnotations(eslint),
    ...createPrettierAnnotations(prettier),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ];

  const lintPassed = eslint.ok && prettier.ok && tscOk;
  const status = lintPassed ? 'passed' : 'failed';
  const conclusion = lintPassed ? 'success' : 'failure';

  const buildNumber = `Build #${process.env.BUILDKITE_BUILD_NUMBER as string}`;
  const numAnnotations =
    annotations.length > Github.GITHUB_MAX_ANNOTATIONS
      ? Github.GITHUB_MAX_ANNOTATIONS
      : annotations.length;
  const annotationString = `${numAnnotations} annotation${
    numAnnotations === 1 ? '' : 's'
  }`;

  const title = `${buildNumber} ${status} (${annotationString} added)`;

  const reportSummary = lintPassed ? 'Lint passed' : summary;

  await Github.createCheckRun(
    'skuba/lint',
    title,
    reportSummary,
    annotations,
    conclusion,
  );
};

export { createGitHubAnnotations };
