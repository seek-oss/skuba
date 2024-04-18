import * as Buildkite from '../../../../api/buildkite';
import type { ESLintOutput } from '../../../adapter/eslint';
import type { PrettierOutput } from '../../../adapter/prettier';
import type { StreamInterceptor } from '../../../lint/external';
import type { InternalLintResult } from '../../internal';

import { createEslintAnnotations } from './eslint';
import { createInternalAnnotations } from './internal';
import { createPrettierAnnotations } from './prettier';
import { createTscAnnotations } from './tsc';

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
