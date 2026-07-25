import { styleText } from 'node:util';

import { hasDebugFlag } from '../../utils/args.ts';
import { createLogger, log } from '../../utils/logging.ts';
import { runESLint } from '../adapter/eslint.ts';
import { runPrettier } from '../adapter/prettier.ts';
import { internalLint } from '../lint/internal.ts';

export const format = async (
  args = process.argv.slice(2),
  overrideConfigFile?: string,
): Promise<void> => {
  const debug = hasDebugFlag(args);

  log.plain(styleText('blueBright', 'skuba lints'));

  const internal = await internalLint('format', {
    debug,
    additionalFlags: args.includes('--force-apply-all-patches')
      ? ['--force-apply-all-patches']
      : [],
    serial: true,
  });

  const logger = createLogger({ debug });

  log.newline();
  log.plain(styleText('magenta', 'ESLint'));

  const eslint = await runESLint('format', logger, overrideConfigFile);

  log.newline();
  log.plain(styleText('cyan', 'Prettier'));

  const prettier = await runPrettier('format', logger);

  if (eslint.ok && prettier.ok && internal.ok) {
    return;
  }

  const tools = [
    ...(eslint.ok ? [] : ['ESLint']),
    ...(prettier.ok ? [] : ['Prettier']),
    ...(internal.ok ? [] : ['skuba']),
  ];

  log.newline();
  log.err(tools.join(', '), 'found issues that require triage.');

  process.exitCode = 1;
};
