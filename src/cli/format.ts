import chalk from 'chalk';

import { hasDebugFlag } from '../utils/args';
import { createLogger, log } from '../utils/logging';

import { runESLint } from './adapter/eslint';
import { runPrettier } from './adapter/prettier';
import { internalLint } from './lint/internal';

export const format = async (
  args = process.argv.slice(2),
  overrideConfigFile?: string,
): Promise<void> => {
  const debug = hasDebugFlag(args);

  log.plain(chalk.blueBright('skuba lints'));
  const internal = await internalLint('format', { debug, serial: true });

  const logger = createLogger(debug);

  log.newline();
  log.plain(chalk.magenta('ESLint'));

  const eslint = await runESLint('format', logger, overrideConfigFile);

  log.newline();
  log.plain(chalk.cyan('Prettier'));

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
