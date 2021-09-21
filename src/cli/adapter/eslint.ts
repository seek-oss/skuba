import path from 'path';

import chalk from 'chalk';
import { ESLint } from 'eslint';

import { Logger } from '../../utils/logging';

const symbolForResult = (result: ESLint.LintResult) => {
  if (result.errorCount) {
    return chalk.red('○');
  }

  return result.warningCount ? chalk.yellow('◍') : chalk.green('○');
};

export const runESLint = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<boolean> => {
  logger.debug('Initialising ESLint...');

  const engine = new ESLint({
    extensions: ['js', 'ts', 'tsx'],
    fix: mode === 'format',
    reportUnusedDisableDirectives: 'error',
  });

  const cwd = process.cwd();

  logger.debug('Processing files...');

  const [formatter, results] = await Promise.all([
    engine.loadFormatter(),
    engine.lintFiles('.'),
  ]);

  let errors = 0;

  logger.plain('Processed', results.length, 'files.');

  for (const result of results) {
    errors += result.errorCount;

    logger.debug(symbolForResult(result), path.relative(cwd, result.filePath));
  }

  await ESLint.outputFixes(results);

  const output = formatter.format(results);

  if (output) {
    logger.plain(output);
  }

  return errors === 0;
};
