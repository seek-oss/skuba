import type { ESLintOutput } from '../../../adapter/eslint.ts';
import type { PrettierOutput } from '../../../adapter/prettier.ts';
import type { StreamInterceptor } from '../../../lint/external.ts';
import type { InternalLintResult } from '../../internal.ts';

import { createEslintAnnotations } from './eslint.ts';
import { createInternalAnnotations } from './internal.ts';
import { createPrettierAnnotations } from './prettier.ts';
import { createTscAnnotations } from './tsc.ts';

import * as Buildkite from '@skuba-lib/api/buildkite';
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
