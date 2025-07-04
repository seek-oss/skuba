import {
  buildNameFromEnvironment,
  enabledFromEnvironment,
} from '../../../../api/github/environment.js';
import * as GitHub from '../../../../api/github/index.js';
import type { ESLintOutput } from '../../../adapter/eslint.js';
import type { PrettierOutput } from '../../../adapter/prettier.js';
import type { StreamInterceptor } from '../../../lint/external.js';
import type { InternalLintResult } from '../../internal.js';

import { createEslintAnnotations } from './eslint.js';
import { createInternalAnnotations } from './internal.js';
import { createPrettierAnnotations } from './prettier.js';
import { createTscAnnotations } from './tsc.js';

export const createGitHubAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
) => {
  if (!enabledFromEnvironment()) {
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

  const build = buildNameFromEnvironment();

  await GitHub.createCheckRun({
    name: 'skuba/lint',
    summary,
    annotations,
    conclusion: isOk ? 'success' : 'failure',
    title: `${build} ${isOk ? 'passed' : 'failed'}`,
  });
};
