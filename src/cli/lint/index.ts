import type { Writable } from 'stream';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args';
import { tryRefreshIgnoreFiles } from '../configure/refreshIgnoreFiles';

import { externalLint } from './external';
import { internalLint } from './internal';
import type { Input } from './types';

export const lint = async (
  args = process.argv.slice(2),
  tscOutputStream: Writable | undefined = undefined,
  workerThreads = true,
) => {
  await tryRefreshIgnoreFiles();

  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream,
    workerThreads,
  };

  await externalLint(opts);

  await internalLint();
};
