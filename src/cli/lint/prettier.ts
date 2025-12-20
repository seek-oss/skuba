import { styleText } from 'node:util';
import { isMainThread } from 'worker_threads';

import { createLogger } from '../../utils/logging.js';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker.js';
import { type PrettierOutput, runPrettier } from '../adapter/prettier.js';

import type { Input } from './types.js';

const LOG_PREFIX = styleText('cyan', 'Prettier │');

export const runPrettierInCurrentThread = ({ debug }: Input) =>
  runPrettier('lint', createLogger({ debug, prefixes: [LOG_PREFIX] }));

export const runPrettierInWorkerThread = (input: Input) =>
  execWorkerThread<Input, PrettierOutput>(__filename, input);

if (!isMainThread) {
  postWorkerOutput(
    runPrettierInCurrentThread,
    createLogger({ debug: false, prefixes: [LOG_PREFIX] }),
  );
}
