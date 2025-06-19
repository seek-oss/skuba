import type { ESLintOutput } from '../../../cli/adapter/eslint.js';
import type { PrettierOutput } from '../../../cli/adapter/prettier.js';
import type { StreamInterceptor } from '../external.js';
import type { InternalLintResult } from '../internal.js';

import { createBuildkiteAnnotations } from './buildkite/index.js';
import { createGitHubAnnotations } from './github/index.js';

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
