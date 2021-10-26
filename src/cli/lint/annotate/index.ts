import { ESLintOutput } from 'cli/adapter/eslint';
import { PrettierOutput } from 'cli/adapter/prettier';

import { StreamInterceptor } from '../external';

import { createBuildkiteAnnotations } from './buildkite';

export const createAnnotations = async (
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  await Promise.all([
    createBuildkiteAnnotations(eslint, prettier, tscOk, tscOutputStream),
  ]);
};
