import type { ESLintOutput } from 'cli/adapter/eslint';
import type { PrettierOutput } from 'cli/adapter/prettier';

import type { StreamInterceptor } from '../external';

import { createBuildkiteAnnotations } from './buildkite';
import { createGitHubAnnotations } from './github';

export const createAnnotations = async (
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  await Promise.all([
    createGitHubAnnotations(eslint, prettier, tscOk, tscOutputStream),
    createBuildkiteAnnotations(eslint, prettier, tscOk, tscOutputStream),
  ]);
};
