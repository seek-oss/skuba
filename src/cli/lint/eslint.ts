import path from 'path';
import { isMainThread } from 'worker_threads';

import chalk from 'chalk';

import { createLogger } from '../../utils/logging';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker';
import { type ESLintOutput, runESLint } from '../adapter/eslint';

import type { Input } from './types';

const LOG_PREFIX = chalk.magenta('ESLint   │');

export const runESLintInCurrentThread = ({ debug, eslintConfigFile }: Input) =>
  runESLint('lint', createLogger(debug, LOG_PREFIX), eslintConfigFile);

export const runESLintInWorkerThread = (input: Input) =>
  execWorkerThread<Input, ESLintOutput>(
    path.posix.join(__dirname, 'eslint.js'),
    input,
  );

if (!isMainThread) {
  postWorkerOutput(runESLintInCurrentThread, createLogger(false, LOG_PREFIX));
}
