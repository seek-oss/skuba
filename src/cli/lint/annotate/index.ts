import { ESLintOutput } from 'cli/adapter/eslint';
import { PrettierOutput } from 'cli/adapter/prettier';

import { StreamInterceptor } from '../external';

import { createBuildkiteAnnotations } from './buildkite';
import { createGitHubAnnotations } from './github';

const createAnnotations = async (
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
  summary: string,
): Promise<void> => {
  await Promise.all([
    createGitHubAnnotations(eslint, prettier, tscOk, tscOutputStream, summary),
    createBuildkiteAnnotations(eslint, prettier, tscOk, tscOutputStream),
  ]);
};

export { createAnnotations };
