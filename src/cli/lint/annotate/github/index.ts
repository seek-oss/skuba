import * as GitHub from '../../../../api/github';
import { ESLintOutput } from '../../../../cli/adapter/eslint';
import { PrettierOutput } from '../../../../cli/adapter/prettier';
import { StreamInterceptor } from '../../../../cli/lint/external';

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
  const annotations: GitHub.Annotation[] = [
    ...createEslintAnnotations(eslint),
    ...createPrettierAnnotations(prettier),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ];

  const conclusion = eslint.ok && prettier.ok && tscOk ? 'success' : 'failure';

  const reportSummary =
    eslint.ok && prettier.ok && tscOk ? 'Lint passed' : summary;

  await GitHub.createCheckRun(
    'skuba/lint',
    reportSummary,
    annotations,
    conclusion,
  );
};

export { createGitHubAnnotations };
