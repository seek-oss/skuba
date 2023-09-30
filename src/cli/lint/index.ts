import type { Writable } from 'stream';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args';
import { upgradeSkuba } from '../configure/upgrade';

import { externalLint } from './external';
import { internalLint } from './internal';
import type { Input } from './types';

export const lint = async (
  args = process.argv.slice(2),
  tscOutputStream: Writable | undefined = undefined,
  workerThreads = true,
) => {
  await upgradeSkuba();

  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream,
    workerThreads,
  };

  await externalLint(opts);

  await internalLint();
};
