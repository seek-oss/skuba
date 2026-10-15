import type { Writable } from 'stream';
import { inspect } from 'util';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args.ts';
import { log } from '../../utils/logging.ts';
import { detectPackageManager } from '../../utils/packageManager.ts';
import { throwOnTimeout } from '../../utils/wait.ts';

import { createAnnotations } from './annotate/index.ts';
import { autofix } from './autofix.ts';
import { externalLint } from './external.ts';
import { internalLint } from './internal.ts';
import type { Input } from './types.ts';

export const lint = async (
  args = process.argv.slice(2),
  tscWriteable: Writable | undefined = undefined,
  workerThreads = true,
  options: { pendingChanges?: boolean } = {},
) => {
  const opts: Input = {
    debug: hasDebugFlag(args),
    serial: hasSerialFlag(args),
    tscOutputStream: tscWriteable,
    workerThreads,
  };

  const { eslint, oxfmt, tscOk, tscOutputStream } = await externalLint(opts);
  const internal = await internalLint('lint', opts);

  try {
    await throwOnTimeout(
      createAnnotations(internal, eslint, oxfmt, tscOk, tscOutputStream),
      { s: 30 },
    );
  } catch (err) {
    log.warn('Failed to annotate lint results.');
    log.subtle(inspect(err));
  }

  if (!internal.ok || !eslint.ok || !oxfmt.ok || !tscOk) {
    process.exitCode = 1;

    const tools = [
      ...(internal.ok ? [] : ['skuba']),
      ...(eslint.ok ? [] : ['ESLint']),
      ...(oxfmt.ok ? [] : ['Oxfmt']),
      ...(tscOk ? [] : ['tsc']),
    ];

    log.err(`${tools.join(', ')} found issues that require triage.`);

    if (internal.fixable || eslint.fixable || !oxfmt.ok) {
      const packageManager = await detectPackageManager();
      log.newline();
      log.warn(
        `Try running ${log.bold(
          `${packageManager.print.exec} skuba format`,
        )} to fix them.`,
      );
    }
  }

  await autofix({
    debug: opts.debug,
    eslint: eslint.fixable,
    oxfmt: !oxfmt.ok,
    internal: internal.fixable,
    // An upgrade may already have written patches. Push them even when this
    // lint run is clean, which is when autofix would otherwise return early.
    pendingChanges: options.pendingChanges,
  });
};
