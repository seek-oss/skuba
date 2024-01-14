import type { ESLintOutput } from '../../../cli/adapter/eslint';
import type { PrettierOutput } from '../../../cli/adapter/prettier';
import type { StreamInterceptor } from '../external';
import type { InternalLintResult } from '../internal';

import { createBuildkiteAnnotations } from './buildkite';
import { createGitHubAnnotations } from './github';

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
