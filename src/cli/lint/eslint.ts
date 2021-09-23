import chalk from 'chalk';

import { createLogger } from '../../utils/logging';
import { startWorkerThread } from '../../utils/worker';
import { runESLint } from '../adapter/eslint';

import type { Input } from './types';

startWorkerThread(({ debug }: Input) =>
  runESLint('lint', createLogger(debug, chalk.magenta('ESLint   |'))),
).catch((err) => {
  throw err;
});
