import chalk from 'chalk';

import { hasDebugFlag } from '../utils/args';
import { createLogger, log } from '../utils/logging';

import { runESLint } from './adapter/eslint';
import { runPrettier } from './adapter/prettier';
import { tryAddEmptyExports } from './configure/addEmptyExports';
import { tryPatchRenovateConfig } from './configure/patchRenovateConfig';
import { tryRefreshIgnoreFiles } from './configure/refreshIgnoreFiles';

export const format = async (args = process.argv.slice(2)): Promise<void> => {
  await Promise.all([
    tryAddEmptyExports(),
    tryPatchRenovateConfig(),
    tryRefreshIgnoreFiles(),
  ]);

  const debug = hasDebugFlag(args);
  const logger = createLogger(debug);

  log.plain(chalk.magenta('ESLint'));

  const eslint = await runESLint('format', logger);

  log.newline();
  log.plain(chalk.cyan('Prettier'));

  const prettier = await runPrettier('format', logger);

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
