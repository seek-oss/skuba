import chalk from 'chalk';

import { hasDebugFlag } from '../utils/args';
import { createLogger, log } from '../utils/logging';

import { runESLint } from './adapter/eslint';
import { runPrettier } from './adapter/prettier';

export const format = async (args = process.argv) => {
  const debug = hasDebugFlag(args);

  log.plain(chalk.magenta('ESLint'));

  const eslint = await runESLint('format', createLogger(debug));

  log.newline();
  log.plain(chalk.cyan('Prettier'));

  const prettier = await runPrettier('format', createLogger(debug));

  if (eslint.ok && prettier.ok) {
    return;
  }

  const tools = [
    ...(eslint.ok ? [] : ['ESLint']),
    ...(prettier.ok ? [] : ['Prettier']),
  ];

  log.newline();
  log.err(tools.join(', '), 'found issues that require triage.');

  process.exitCode = 1;
};
