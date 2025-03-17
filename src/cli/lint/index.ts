import type { Writable } from 'stream';
import { inspect } from 'util';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args';
import { log } from '../../utils/logging';
import { detectPackageManager } from '../../utils/packageManager';
import { throwOnTimeout } from '../../utils/wait';

import { createAnnotations } from './annotate';
import { autofix } from './autofix';
import { externalLint } from './external';
import { internalLint } from './internal';
import type { Input } from './types';

export const lint = async (
  args = process.argv.slice(2),
  tscWriteable: Writable | undefined = undefined,
  workerThreads = false,
) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream: tscWriteable,
    workerThreads,
  };

  const { eslint, prettier, tscOk, tscOutputStream } = await externalLint(opts);
  const internal = await internalLint('lint', opts);

  try {
    await throwOnTimeout(
      createAnnotations(internal, eslint, prettier, tscOk, tscOutputStream),
      { s: 30 },
    );
  } catch (err) {
    log.warn('Failed to annotate lint results.');
    log.subtle(inspect(err));
  }

  if (!internal.ok || !eslint.ok || !prettier.ok || !tscOk) {
    process.exitCode = 1;

    const tools = [
      ...(internal.ok ? [] : ['skuba']),
      ...(eslint.ok ? [] : ['ESLint']),
      ...(prettier.ok ? [] : ['Prettier']),
      ...(tscOk ? [] : ['tsc']),
    ];

    log.err(`${tools.join(', ')} found issues that require triage.`);

    if (internal.fixable || eslint.fixable || !prettier.ok) {
      const packageManager = await detectPackageManager();
      log.newline();
      log.warn(
        `Try running ${log.bold(
          packageManager.print.exec,
          'skuba',
          'format',
        )} to fix them.`,
      );
    }
  }

  await autofix({
    debug: opts.debug,
    eslint: eslint.fixable,
    prettier: !prettier.ok,
    internal: internal.fixable,
  });
};
