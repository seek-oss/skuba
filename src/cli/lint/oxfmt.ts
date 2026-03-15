import { styleText } from 'node:util';
import path from 'path';
import { isMainThread } from 'worker_threads';

import { createLogger } from '../../utils/logging.js';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker.js';
import { type OxfmtOutput, runOxfmt } from '../adapter/oxfmt.js';

import type { Input } from './types.js';

const LOG_PREFIX = styleText('cyan', 'Oxfmt    │');

export const runOxfmtInCurrentThread = ({ debug }: Input) =>
  runOxfmt('lint', createLogger({ debug, prefixes: [LOG_PREFIX] }));

export const runOxfmtInWorkerThread = async (input: Input) =>
  execWorkerThread<Input, OxfmtOutput>(
    path.posix.join(__dirname, 'oxfmt.js'),
    input,
  );

if (!isMainThread) {
  postWorkerOutput(
    runOxfmtInCurrentThread,
    createLogger({ debug: false, prefixes: [LOG_PREFIX] }),
  );
}
