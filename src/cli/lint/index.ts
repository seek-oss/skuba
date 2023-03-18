import type { Writable } from 'stream';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args';
import { tryAddEmptyExports } from '../configure/addEmptyExports';
import { tryPatchRenovateConfig } from '../configure/patchRenovateConfig';
import { tryRefreshIgnoreFiles } from '../configure/refreshIgnoreFiles';

import { externalLint } from './external';
import { internalLint } from './internal';
import type { Input } from './types';

export const lint = async (
  args = process.argv.slice(2),
  tscOutputStream: Writable | undefined = undefined,
  workerThreads = true,
) => {
  await Promise.all([
    tryAddEmptyExports(),
    tryPatchRenovateConfig(),
    tryRefreshIgnoreFiles(),
  ]);

  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream,
    workerThreads,
  };

  await externalLint(opts);

  await internalLint();
};
