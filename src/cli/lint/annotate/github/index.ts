import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

import { log } from '../../../../utils/logging.ts';
import type { ESLintOutput } from '../../../adapter/eslint.ts';
import type { OxfmtResult } from '../../../adapter/oxfmt.ts';
import type { StreamInterceptor } from '../../../lint/external.ts';
import type { InternalLintResult } from '../../internal.ts';

import { createEslintAnnotations } from './eslint.ts';
import { createInternalAnnotations } from './internal.ts';
import { createOxfmtAnnotations } from './oxfmt.ts';
import { createTscAnnotations } from './tsc.ts';

export const createGitHubAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  oxfmt: OxfmtResult,
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
    ...createOxfmtAnnotations(oxfmt),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ];

  const isOk = eslint.ok && oxfmt.ok && internal.ok && tscOk;

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
