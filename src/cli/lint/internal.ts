import { inspect } from 'util';

import chalk from 'chalk';

import { type Logger, createLogger } from '../../utils/logging';
import { upgradeSkuba } from '../configure/upgrade';

import { deleteFilesLint } from './internalLints/deleteFiles';
import { noSkubaTemplateJs } from './internalLints/noSkubaTemplateJs';
import { tryRefreshIgnoreFiles } from './internalLints/refreshIgnoreFiles';
import type { Input } from './types';

export type InternalLintResult = {
  ok: boolean;
  fixable: boolean;
  annotations?: Array<{
    start_line?: number;
    end_line?: number;
    path: string;
    message: string;
  }>;
};

const lints: Array<
  (mode: 'format' | 'lint', logger: Logger) => Promise<InternalLintResult>
> = [deleteFilesLint, noSkubaTemplateJs, tryRefreshIgnoreFiles, upgradeSkuba];

const lintSerially = async (mode: 'format' | 'lint', logger: Logger) => {
  const results: InternalLintResult[] = [];
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

export const internalLint = async (
  mode: 'format' | 'lint',
  input?: Input,
): Promise<InternalLintResult> => {
  const start = process.hrtime.bigint();
  const logger = createLogger(
    input?.debug ?? false,
    ...(mode === 'lint' ? [chalk.blueBright('skuba    │')] : []),
  );

  try {
    const lint = selectLintFunction(input);
    const results = await lint(mode, logger);
    const result = combineResults(results);
    const end = process.hrtime.bigint();
    logger.plain(`Processed skuba lints in ${logger.timing(start, end)}.`);
    return result;
  } catch (err) {
    logger.err(logger.bold('Failed to run skuba lints.'));
    logger.subtle(inspect(err));

    process.exitCode = 1;

    return { ok: false, fixable: false, annotations: [] };
  }
};

const combineResults = (results: InternalLintResult[]): InternalLintResult =>
  results.reduce(
    (cur, next) => ({
      ok: cur.ok && next.ok,
      fixable: cur.fixable || next.fixable,
      annotations: [...(cur.annotations ?? []), ...(next.annotations ?? [])],
    }),
    { ok: true, fixable: false },
  );
