import path from 'path';
import { isMainThread } from 'worker_threads';

import chalk from 'chalk';

import { createLogger } from '../../utils/logging';
import { execWorkerThread, startWorkerThread } from '../../utils/worker';
import { runESLint } from '../adapter/eslint';

import type { Input } from './types';

export const runESLintInMainThread = ({ debug }: Input) =>
  runESLint('lint', createLogger(debug, chalk.magenta('ESLint   |')));

export const runESLintInWorkerThread = (input: Input) =>
  execWorkerThread<Input, boolean>(
    path.posix.join(__dirname, 'eslint.js'),
    input,
  );

if (!isMainThread) {
  startWorkerThread(runESLintInMainThread).catch((err) => {
    throw err;
  });
}
