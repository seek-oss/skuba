import path from 'path';
import { isMainThread } from 'worker_threads';

import chalk from 'chalk';

import { createLogger } from '../../utils/logging';
import { execWorkerThread, startWorkerThread } from '../../utils/worker';
import { runPrettier } from '../adapter/prettier';

import type { Input } from './types';

export const runPrettierInMainThread = ({ debug }: Input) =>
  runPrettier('lint', createLogger(debug, chalk.cyan('Prettier |')));

export const runPrettierInWorkerThread = (input: Input) =>
  execWorkerThread<Input, boolean>(
    path.posix.join(__dirname, 'prettier.js'),
    input,
  );

if (!isMainThread) {
  startWorkerThread(runPrettierInMainThread).catch((err) => {
    throw err;
  });
}
