import * as Buildkite from '@skuba-lib/api/buildkite';

import type { ESLintOutput } from '../../../adapter/eslint.ts';
import type { OxfmtResult } from '../../../adapter/oxfmt.ts';
import type { StreamInterceptor } from '../../../lint/external.ts';
import type { InternalLintResult } from '../../internal.ts';

import { createEslintAnnotations } from './eslint.ts';
import { createInternalAnnotations } from './internal.ts';
import { createOxfmtAnnotations } from './oxfmt.ts';
import { createTscAnnotations } from './tsc.ts';

export const createBuildkiteAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  oxfmt: OxfmtResult,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  if (internal.ok && eslint.ok && oxfmt.ok && tscOk) {
    return;
  }

  const buildkiteOutput = [
    '`skuba lint` found issues that require triage:',
    ...createInternalAnnotations(internal),
    ...createEslintAnnotations(eslint),
    ...createOxfmtAnnotations(oxfmt),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ].join('\n\n');

  await Buildkite.annotate(buildkiteOutput, {
    context: 'skuba-lint',
    scopeContextToStep: true,
    style: 'error',
  });
};
