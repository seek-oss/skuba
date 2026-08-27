import { log } from '../../../../utils/logging.js';
import type { ESLintOutput } from '../../../adapter/eslint.js';
import type { OxfmtResult } from '../../../adapter/oxfmt.js';
import type { StreamInterceptor } from '../../../lint/external.js';
import type { InternalLintResult } from '../../internal.js';

import { createEslintAnnotations } from './eslint.js';
import { createInternalAnnotations } from './internal.js';
import { createOxfmtAnnotations } from './oxfmt.js';
import { createTscAnnotations } from './tsc.js';

import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

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
