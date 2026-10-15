import type { ESLintOutput } from '../../../cli/adapter/eslint.ts';
import type { OxfmtResult } from '../../../cli/adapter/oxfmt.ts';
import type { StreamInterceptor } from '../external.ts';
import type { InternalLintResult } from '../internal.ts';

import { createBuildkiteAnnotations } from './buildkite/index.ts';
import { createGitHubAnnotations } from './github/index.ts';

export const createAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  oxfmt: OxfmtResult,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  await Promise.all([
    createGitHubAnnotations(internal, eslint, oxfmt, tscOk, tscOutputStream),
    createBuildkiteAnnotations(internal, eslint, oxfmt, tscOk, tscOutputStream),
  ]);
};
