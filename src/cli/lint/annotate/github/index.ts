import * as GitHub from '../../../../api/github';
import { ESLintOutput } from '../../../../cli/adapter/eslint';
import { PrettierOutput } from '../../../../cli/adapter/prettier';
import { StreamInterceptor } from '../../../../cli/lint/external';

import { createEslintAnnotations } from './eslint';
import { createPrettierAnnotations } from './prettier';
import { createTscAnnotations } from './tsc';

export const createGitHubAnnotations = async (
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
) => {
  const annotations: GitHub.Annotation[] = [
    ...createEslintAnnotations(eslint),
    ...createPrettierAnnotations(prettier),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ];

  const isOk = eslint.ok && prettier.ok && tscOk;
  const conclusion = isOk ? 'success' : 'failure';

  const summary = isOk
    ? '`skuba lint` passed.'
    : '`skuba lint` found issues that require triage.';

  await GitHub.createCheckRunFromBuildkite({
    name: 'skuba/lint',
    summary,
    annotations,
    conclusion,
  });
};
