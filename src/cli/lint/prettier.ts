import path from 'path';
import { isMainThread } from 'worker_threads';

import chalk from 'chalk';

import { createLogger } from '../../utils/logging';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker';
import { type PrettierOutput, runPrettier } from '../adapter/prettier';

import type { Input } from './types';

const LOG_PREFIX = chalk.cyan('Prettier │');

export const runPrettierInCurrentThread = ({ debug }: Input) =>
  runPrettier('lint', createLogger(debug, LOG_PREFIX));

export const runPrettierInWorkerThread = (input: Input) =>
  execWorkerThread<Input, PrettierOutput>(
    path.posix.join(__dirname, 'prettier.js'),
    input,
  );

if (!isMainThread) {
  postWorkerOutput(runPrettierInCurrentThread, createLogger(false, LOG_PREFIX));
}
