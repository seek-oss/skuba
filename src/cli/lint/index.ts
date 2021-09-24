import { hasDebugFlag, hasSerialFlag } from '../../utils/args';

import { externalLint } from './external';
import { internalLint } from './internal';
import type { Input } from './types';

export const lint = async (
  args = process.argv,
  tscOutputStream: NodeJS.WritableStream | undefined = undefined,
) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream,
  };

  await externalLint(opts);

  await internalLint();
};
