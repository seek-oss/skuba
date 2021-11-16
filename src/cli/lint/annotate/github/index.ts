import * as GitHub from '../../../../api/github';
import {
  buildNameFromEnvironment,
  enabledFromEnvironment,
} from '../../../../api/github/environment';
import type { ESLintOutput } from '../../../../cli/adapter/eslint';
import type { PrettierOutput } from '../../../../cli/adapter/prettier';
import type { StreamInterceptor } from '../../../../cli/lint/external';

import { createEslintAnnotations } from './eslint';
import { createPrettierAnnotations } from './prettier';
import { createTscAnnotations } from './tsc';

export const createGitHubAnnotations = async (
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
) => {
  if (!enabledFromEnvironment()) {
    return;
  }

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

  const build = buildNameFromEnvironment();

  await GitHub.createCheckRun({
    name: 'skuba/lint',
    summary,
    annotations,
    conclusion,
    title: `${build} ${isOk ? 'passed' : 'failed'}`,
  });
};
