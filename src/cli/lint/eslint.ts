import { styleText } from 'node:util';
import path from 'path';
import { isMainThread } from 'worker_threads';

import { COMMAND_DIR } from '../../utils/command.js';
import { createLogger } from '../../utils/logging.js';
import { execWorkerThread, postWorkerOutput } from '../../utils/worker.js';
import { type ESLintOutput, runESLint } from '../adapter/eslint.js';

import type { Input } from './types.js';

const LOG_PREFIX = styleText('magenta', 'ESLint │');

export const runESLintInCurrentThread = ({ debug, eslintConfigFile }: Input) =>
  runESLint(
    'lint',
    createLogger({ debug, prefixes: [LOG_PREFIX] }),
    eslintConfigFile,
  );

export const runESLintInWorkerThread = (input: Input) =>
  execWorkerThread<Input, ESLintOutput>(
    path.join(COMMAND_DIR, 'lint', 'eslint.js'),
    input,
  );

if (!isMainThread) {
  postWorkerOutput(
    runESLintInCurrentThread,
    createLogger({ debug: false, prefixes: [LOG_PREFIX] }),
  );
}
