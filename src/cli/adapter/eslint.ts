import path from 'path';

import chalk from 'chalk';
import { ESLint } from 'eslint';

import { Buildkite } from '../..';
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
    // TODO: enable this once we have a less overzealous `skuba configure` that
    // everyone can apply to update their `.gitignore` files.
    // cache: true,
    extensions: ['js', 'ts', 'tsx'],
    fix: mode === 'format',
    reportUnusedDisableDirectives: 'error',
  });

  const cwd = process.cwd();

  logger.debug('Processing files...');

  const start = process.hrtime.bigint();

  const [formatter, results] = await Promise.all([
    engine.loadFormatter(),
    engine.lintFiles('.'),
  ]);

  const end = process.hrtime.bigint();

  logger.plain(
    `Processed ${logger.pluralise(results.length, 'file')} in ${logger.timing(
      start,
      end,
    )}.`,
  );

  let errors = 0;

  for (const result of results) {
    errors += result.errorCount;

    logger.debug(symbolForResult(result), path.relative(cwd, result.filePath));
  }

  await ESLint.outputFixes(results);

  const output = formatter.format(results);

  if (output) {
    logger.plain(output);

    await Buildkite.annotate(output, {
      context: `skuba-${mode}-eslint`,
      style: 'error',
    });
  }

  return errors === 0;
};
