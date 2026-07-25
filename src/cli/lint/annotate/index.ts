import type { ESLintOutput } from '../../../cli/adapter/eslint.ts';
import type { PrettierOutput } from '../../../cli/adapter/prettier.ts';
import type { StreamInterceptor } from '../external.ts';
import type { InternalLintResult } from '../internal.ts';

import { createBuildkiteAnnotations } from './buildkite/index.ts';
import { createGitHubAnnotations } from './github/index.ts';

export const createAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  await Promise.all([
    createGitHubAnnotations(internal, eslint, prettier, tscOk, tscOutputStream),
    createBuildkiteAnnotations(
      internal,
      eslint,
      prettier,
      tscOk,
      tscOutputStream,
    ),
  ]);
};
