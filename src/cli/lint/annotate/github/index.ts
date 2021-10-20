import {
  Annotation,
  createCheckRun,
  isGithubAnnotationsEnabled,
} from 'api/github/check-run';
import { ESLintOutput } from 'cli/adapter/eslint';
import { PrettierOutput } from 'cli/adapter/prettier';
import { StreamInterceptor } from 'cli/lint/external';

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
  if (!isGithubAnnotationsEnabled()) {
    return;
  }

  const annotations: Annotation[] = [
    ...createEslintAnnotations(eslint),
    ...createPrettierAnnotations(prettier),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ];

  const lintFailed = eslint.ok && prettier.ok && tscOk;

  const buildNumber = `Build #${process.env.BUILDKITE_BUILD_NUMBER as string}`;
  const status = lintFailed ? 'failed' : 'passed';
  const title = `${buildNumber} ${status} (${annotations.length} annotations added)`;

  const conclusion = lintFailed ? 'failure' : 'success';

  const reportSummary = lintFailed ? summary : '';

  await createCheckRun(
    'skuba/lint',
    title,
    reportSummary,
    annotations,
    conclusion,
  );
};

export { createGitHubAnnotations };
