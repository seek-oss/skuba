import { execConcurrently } from '../../utils/exec.js';

import type { Input } from './types.js';

export const runTscInNewProcess = async ({
  debug,
  tscOutputStream,
}: Input): Promise<boolean> => {
  const command = [
    'tsc',
    ...(debug ? ['--extendedDiagnostics'] : []),
    '--noEmit',
  ].join(' ');

  try {
    // Misappropriate `concurrently` as a stdio prefixer.
    // We can use our regular console logger once we decide on an approach for
    // compiling in-process, whether by interacting with the TypeScript Compiler
    // API directly or using a higher-level tool like esbuild.
    await execConcurrently(
      [
        {
          command,
          name: 'tsc',
          prefixColor: 'blue',
        },
      ],
      {
        maxProcesses: 1,
        nameLength: 'Prettier'.length,
        outputStream: tscOutputStream,
      },
    );

    return true;
  } catch {
    return false;
  }
};
