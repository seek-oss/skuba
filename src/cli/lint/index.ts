import type { Writable } from 'stream';
import { inspect } from 'util';

import { hasDebugFlag, hasSerialFlag } from '../../utils/args.js';
import { log } from '../../utils/logging.js';
import { detectPackageManager } from '../../utils/packageManager.js';
import { throwOnTimeout } from '../../utils/wait.js';

import { createAnnotations } from './annotate/index.js';
import { autofix } from './autofix.js';
import { externalLint } from './external.js';
import { internalLint } from './internal.js';
import type { Input } from './types.js';

export const lint = async (
  args = process.argv.slice(2),
  tscWriteable: Writable | undefined = undefined,
  workerThreads = true,
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
          `${packageManager.print.exec} skuba format`,
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
