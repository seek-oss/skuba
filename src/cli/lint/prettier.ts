import chalk from 'chalk';

import { createLogger } from '../../utils/logging';
import { startWorkerThread } from '../../utils/worker';
import { runPrettier } from '../adapter/prettier';

import type { Input } from './types';

startWorkerThread(({ debug }: Input) =>
  runPrettier('lint', createLogger(debug, chalk.cyan('Prettier |'))),
).catch((err) => {
  throw err;
});
