import chalk from 'chalk';

import { hasDebugFlag } from '../utils/args';
import { createLogger, log } from '../utils/logging';

import { runESLint } from './adapter/eslint';
import { runPrettier } from './adapter/prettier';

export const format = async () => {
  const debug = hasDebugFlag();

  log.newline();
  log.plain(chalk.magenta('Fixing code with ESLint'));
  log.plain(chalk.magenta('-----------------------'));

  const eslintOk = await runESLint('format', createLogger(debug));

  log.newline();
  log.plain(chalk.cyan('Formatting code with Prettier'));
  log.plain(chalk.cyan('-----------------------------'));

  const prettierOk = await runPrettier('format', createLogger(debug));

  log.newline();

  if (eslintOk && prettierOk) {
    return;
  }

  const tools = [
    ...(eslintOk ? [] : ['ESLint']),
    ...(prettierOk ? [] : ['Prettier']),
  ];

  log.err(tools.join(', '), 'found issues that require triage.');

  process.exitCode = 1;
};
