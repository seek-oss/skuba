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
  fixable: boolean;
  ok: boolean;
  output: string;
  warnings: ESLintResult[];
}

export const runESLint = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<ESLintOutput> => {
  logger.debug('Initialising ESLint...');

  const engine = new ESLint({
    cache: true,
    fix: mode === 'format',
    reportUnusedDisableDirectives: 'error',
  });

  const cwd = process.cwd();

  logger.debug('Processing files...');

  const start = process.hrtime.bigint();

  /* eslint-disable no-console */
  const ogConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      args[0] !==
      // `eslint-plugin-react` prints this annoying error on non-React repos.
      // We still want to support React linting for repos that have React code,
      // so we have to manually suppress it.
      //
      // https://github.com/yannickcr/eslint-plugin-react/blob/7484acaca8351a8568fa99344bc811c5cd8396bd/lib/util/version.js#L61-L65
      'Warning: React version was set to "detect" in eslint-plugin-react settings, but the "react" package is not installed. Assuming latest React version for linting.'
    ) {
      ogConsoleError(...args);
    }
  };

  const [formatter, results] = await Promise.all([
    engine.loadFormatter(),
    engine.lintFiles('.'),
  ]);

  console.error = ogConsoleError;
  /* eslint-enable no-console */

  const end = process.hrtime.bigint();

  logger.plain(
    `Processed ${pluralise(results.length, 'file')} in ${logger.timing(
      start,
      end,
    )}.`,
  );

  const errors: ESLintResult[] = [];
  const warnings: ESLintResult[] = [];
  let fixable = false;

  for (const result of results) {
    const relativePath = path.relative(cwd, result.filePath);
    if (result.fixableErrorCount + result.fixableWarningCount) {
      fixable = true;
    }

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

  return { errors, fixable, ok, output, warnings };
};
