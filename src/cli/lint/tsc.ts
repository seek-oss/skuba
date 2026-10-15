import { styleText } from 'node:util';

import { createExec } from '../../utils/exec.ts';

import type { Input } from './types.ts';

export const runTscInNewProcess = async ({
  debug,
  tscOutputStream,
}: Input): Promise<boolean> => {
  const args = [...(debug ? ['--extendedDiagnostics'] : []), '--noEmit'];
  const outputStream = tscOutputStream ?? process.stdout;
  const prefix = styleText('blue', `${'tsc'.padEnd('ESLint'.length)} │`);

  function* prefixOutput(line: unknown) {
    yield `${prefix} ${String(line)}`;
  }

  try {
    const exec = createExec({
      all: true,
      buffer: false,
      reject: false,
      stdio: ['inherit', prefixOutput, prefixOutput],
    });
    const subprocess = exec('tsc', ...args);
    subprocess.all?.pipe(outputStream, { end: false });

    const result = await subprocess;
    outputStream.write(
      `${prefix} tsc ${args.join(' ')} exited with code ${result.exitCode ?? result.signal ?? 1}\n`,
    );

    return !result.failed;
  } catch {
    return false;
  }
};
