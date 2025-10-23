import path from 'path';
import { isMainThread } from 'worker_threads';

import chalk from 'chalk';

import { createLogger } from '../../utils/logging.js';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker.js';
import { type PrettierOutput, runPrettier } from '../adapter/prettier.js';

import type { Input } from './types.js';

const LOG_PREFIX = chalk.cyan('Prettier │');

export const runPrettierInCurrentThread = ({ debug }: Input) =>
  runPrettier('lint', createLogger({ debug, prefixes: [LOG_PREFIX] }));

export const runPrettierInWorkerThread = (input: Input) =>
  execWorkerThread<Input, PrettierOutput>(
    path.posix.join(import.meta.dirname, 'prettier.js'),
    input,
  );

if (!isMainThread) {
  postWorkerOutput(
    runPrettierInCurrentThread,
    createLogger({ debug: false, prefixes: [LOG_PREFIX] }),
  );
}
