import path from 'path';

import chalk from 'chalk';
import { type ESLint, type Linter, loadESLint } from 'eslint';

import { type Logger, pluralise } from '../../utils/logging';

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

  const cwd = process.cwd();

  const ESLint = await loadESLint({ useFlatConfig: true });
  const engine = new ESLint({
    allowInlineConfig: true,
    cache: true,
    errorOnUnmatchedPattern: true,
    ignore: true,
    fix: mode === 'format',
    overrideConfig: {
      languageOptions: { globals: {}, parserOptions: {} },
      rules: {},
      linterOptions: {
        reportUnusedDisableDirectives: true,
      },
    },
    stats: false,
    warnIgnored: true,
  });

  logger.debug('Processing files...');

  const start = process.hrtime.bigint();

  const [formatter, results] = await Promise.all([
    engine.loadFormatter(),
    engine.lintFiles([]),
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

  const output = await formatter.format(results, {
    cwd,
    rulesMeta: engine.getRulesMetaForResults(results),
  });

  if (output) {
    logger.plain(output);
  }

  return { errors, fixable, ok, output, warnings };
};
