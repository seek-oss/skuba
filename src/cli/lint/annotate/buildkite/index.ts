import * as Buildkite from '../../../../api/buildkite/index.js';
import type { ESLintOutput } from '../../../adapter/eslint.js';
import type { PrettierOutput } from '../../../adapter/prettier.js';
import type { StreamInterceptor } from '../../../lint/external.js';
import type { InternalLintResult } from '../../internal.js';

import { createEslintAnnotations } from './eslint.js';
import { createInternalAnnotations } from './internal.js';
import { createPrettierAnnotations } from './prettier.js';
import { createTscAnnotations } from './tsc.js';

export const createBuildkiteAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  if (internal.ok && eslint.ok && prettier.ok && tscOk) {
    return;
  }

  const buildkiteOutput = [
    '`skuba lint` found issues that require triage:',
    ...createInternalAnnotations(internal),
    ...createEslintAnnotations(eslint),
    ...createPrettierAnnotations(prettier),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ].join('\n\n');

  await Buildkite.annotate(buildkiteOutput, {
    context: 'skuba-lint',
    scopeContextToStep: true,
    style: 'error',
  });
};
