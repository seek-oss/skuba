import type { Writable } from 'stream';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args';

import { autofix } from './autofix';
import { externalLint } from './external';
import { internalLint } from './internal';
import type { Input } from './types';

export const lint = async (
  args = process.argv.slice(2),
  tscOutputStream: Writable | undefined = undefined,
  workerThreads = true,
) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream,
    workerThreads,
  };

  const external = await externalLint(opts);
  const internal = await internalLint('lint', opts);

  await autofix({
    debug: opts.debug,
    eslint: external.eslint.fixable,
    prettier: !external.prettier.ok,
    internal: internal.fixable,
  });
};
