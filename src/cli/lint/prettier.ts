import { styleText } from 'node:util';
import path from 'path';
import { isMainThread } from 'worker_threads';

import { createLogger } from '../../utils/logging.ts';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker.ts';
import { type PrettierOutput, runPrettier } from '../adapter/prettier.ts';

import type { Input } from './types.ts';

const LOG_PREFIX = styleText('cyan', 'Prettier │');

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
