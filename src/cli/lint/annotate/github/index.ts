import { log } from '../../../../utils/logging.ts';
import type { ESLintOutput } from '../../../adapter/eslint.ts';
import type { PrettierOutput } from '../../../adapter/prettier.ts';
import type { StreamInterceptor } from '../../../lint/external.ts';
import type { InternalLintResult } from '../../internal.ts';

import { createEslintAnnotations } from './eslint.ts';
import { createInternalAnnotations } from './internal.ts';
import { createPrettierAnnotations } from './prettier.ts';
import { createTscAnnotations } from './tsc.ts';

import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

export const createGitHubAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
) => {
  if (!GitHub.enabledFromEnvironment()) {
    return;
  }

  if (!(await Git.findRoot({ dir: process.cwd() }))) {
    log.warn('GitHub annotations skipped because no .git directory was found.');
    return;
  }

  const annotations: GitHub.Annotation[] = [
    ...createInternalAnnotations(internal),
    ...createEslintAnnotations(eslint),
    ...createPrettierAnnotations(prettier),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ];

  const isOk = eslint.ok && prettier.ok && internal.ok && tscOk;

  const summary = isOk
    ? '`skuba lint` passed.'
    : '`skuba lint` found issues that require triage.';

  const build = GitHub.buildNameFromEnvironment();

  await GitHub.createCheckRun({
    name: 'skuba/lint',
    summary,
    annotations,
    conclusion: isOk ? 'success' : 'failure',
    title: `${build} ${isOk ? 'passed' : 'failed'}`,
  });
};
