import { inspect } from 'util';

import chalk from 'chalk';

import { type Logger, createLogger } from '../../utils/logging';
import { detectPackageManager } from '../../utils/packageManager';

import { deleteFilesLint } from './internalLints/deleteFiles';
import { noSkubaTemplateJs } from './internalLints/noSkubaTemplateJs';
import { tryRefreshIgnoreFiles } from './internalLints/refreshIgnoreFiles';
import type { Input } from './types';
import { upgradeSkuba } from './upgrade';

const lints = [
  deleteFilesLint,
  noSkubaTemplateJs,
  tryRefreshIgnoreFiles,
  upgradeSkuba,
];

const lintSerially = async (mode: 'format' | 'lint', logger: Logger) => {
  const results = [];
  for (const lint of lints) {
    results.push(await lint(mode, logger));
  }
  return results;
};

const lintConcurrently = (mode: 'format' | 'lint', logger: Logger) =>
  Promise.all(lints.map((lint) => lint(mode, logger)));

const selectLintFunction = (input?: Input) => {
  const isSerial = input?.debug || input?.serial;
  return isSerial ? lintSerially : lintConcurrently;
};

export const internalLint = async (mode: 'format' | 'lint', input?: Input) => {
  const start = process.hrtime.bigint();
  const logger = createLogger(
    input?.debug ?? false,
    ...(mode === 'lint' ? [chalk.blueBright('skuba    │')] : []),
  );

  try {
    const lint = selectLintFunction(input);
    const results = await lint(mode, logger);
    const result = await processResults(results, logger);
    const end = process.hrtime.bigint();
    logger.plain(`Processed skuba lints in ${logger.timing(start, end)}.`);
    return result;
  } catch (err) {
    logger.err(logger.bold('Failed to run skuba lints.'));
    logger.subtle(inspect(err));

    process.exitCode = 1;

    return { ok: false, fixable: false };
  }
};

const processResults = async (
  results: Array<{ ok: boolean; fixable: boolean }>,
  logger: Logger,
) => {
  const result = results.reduce(
    (cur, next) => ({
      ok: cur.ok && next.ok,
      fixable: cur.fixable || next.fixable,
    }),
    { ok: true, fixable: false },
  );

  if (!result.ok) {
    process.exitCode = 1;

    if (result.fixable) {
      const packageManager = await detectPackageManager();
      logger.err(
        `Some skuba lints failed. Try running ${logger.bold(
          packageManager.exec,
          'skuba',
          'format',
        )} to fix them. ${logger.dim('skuba-lint')}`,
      );
    } else {
      logger.err(
        `Some skuba lints failed which require triage. ${logger.dim(
          'skuba-lint',
        )}`,
      );
    }
  }

  return result;
};
