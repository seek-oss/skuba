import path from 'path';
import { isMainThread } from 'worker_threads';

import chalk from 'chalk';

import { createLogger } from '../../utils/logging';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker';
import { ESLintOutput, runESLint } from '../adapter/eslint';

import type { Input } from './types';

export const runESLintInCurrentThread = ({ debug }: Input) =>
  runESLint('lint', createLogger(debug, chalk.magenta('ESLint   │')));

export const runESLintInWorkerThread = (input: Input) =>
  execWorkerThread<Input, ESLintOutput>(
    path.posix.join(__dirname, 'eslint.js'),
    input,
  );

if (!isMainThread) {
  postWorkerOutput(runESLintInCurrentThread).catch((err) => {
    throw err;
  });
}
