import path from 'path';

import chalk from 'chalk';
import type { Linter } from 'eslint';
import { ESLint } from 'eslint';

import type { Logger } from '../../utils/logging';
import { pluralise } from '../../utils/logging';

const symbolForResult = (result: ESLint.LintResult) => {
  if (result.errorCount) {
    return chalk.red('○');
  }

  return result.warningCount ? chalk.yellow('◍') : chalk.green('○');
};

export interface ESLintResult {
  messages: Linter.LintMessage[];
  filePath: string;
}

export interface ESLintOutput {
  errors: ESLintResult[];
  warnings: ESLintResult[];
  ok: boolean;
  output: string;
}

export const runESLint = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<ESLintOutput> => {
  logger.debug('Initialising ESLint...');

  const engine = new ESLint({
    cache: true,
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
    `Processed ${pluralise(results.length, 'file')} in ${logger.timing(
      start,
      end,
    )}.`,
  );

  const errors: ESLintResult[] = [];
  const warnings: ESLintResult[] = [];

  for (const result of results) {
    const relativePath = path.relative(cwd, result.filePath);
    if (result.errorCount) {
      errors.push({
        filePath: relativePath,
        messages: result.messages,
      });
    }

    if (result.warningCount) {
      warnings.push({
        filePath: relativePath,
        messages: result.messages,
      });
    }

    logger.debug(symbolForResult(result), relativePath);
  }

  const ok = errors.length === 0;

  await ESLint.outputFixes(results);

  const output = await formatter.format(results);

  if (output) {
    logger.plain(output);
  }

  return { ok, output, errors, warnings };
};
