import { styleText } from 'node:util';
import { inspect } from 'util';

import { type Logger, childLogger, createLogger } from '../../utils/logging.js';

import { tryDetectBadCodeowners } from './internalLints/detectBadCodeowners.js';
import { noSkubaTemplateJs } from './internalLints/noSkubaTemplateJs.js';
import { tryRefreshConfigFiles } from './internalLints/refreshConfigFiles.js';
import { upgradeSkuba } from './internalLints/upgrade/index.js';
import type { Input } from './types.js';

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
  Array<{
    name: string;
    lint: (
      mode: 'format' | 'lint',
      logger: Logger,
      additionalFlags: string[],
    ) => Promise<InternalLintResult>;
  }>
> = [
  // Run upgradeSkuba first, in particular before refreshConfigFiles, for npmrc handling
  [{ name: 'upgrade-skuba', lint: upgradeSkuba }],
  [
    { name: 'no-skuba-template-js', lint: noSkubaTemplateJs },
    { name: 'refresh-config-files', lint: tryRefreshConfigFiles },
    { name: 'detect-bad-codeowners', lint: tryDetectBadCodeowners },
  ],
];

const lintSerially = async (
  mode: 'format' | 'lint',
  logger: Logger,
  additionalFlags: string[],
) => {
  const results: InternalLintResult[] = [];
  for (const lintGroup of lints) {
    for (const { lint, name } of lintGroup) {
      results.push(
        await lint(
          mode,
          childLogger(logger, { suffixes: [styleText('dim', name)] }),
          additionalFlags,
        ),
      );
    }
  }
  return results;
};

const lintConcurrently = async (
  mode: 'format' | 'lint',
  logger: Logger,
  additionalFlags: string[],
) => {
  const results: InternalLintResult[] = [];

  for (const lintGroup of lints) {
    results.push(
      ...(await Promise.all(
        lintGroup.map(async ({ name, lint }) =>
          lint(
            mode,
            childLogger(logger, { suffixes: [styleText('dim', name)] }),
            additionalFlags,
          ),
        ),
      )),
    );
  }

  return results;
};

const selectLintFunction = (input?: Input) => {
  const isSerial = input?.debug || input?.serial;
  return isSerial ? lintSerially : lintConcurrently;
};

export const internalLint = async (
  mode: 'format' | 'lint',
  input?: Input,
): Promise<InternalLintResult> => {
  const start = process.hrtime.bigint();
  const logger = createLogger({
    debug: input?.debug ?? false,
    prefixes: [
      ...(mode === 'lint' ? [styleText('blueBright', 'skuba    │')] : []),
    ],
  });

  try {
    const lint = selectLintFunction(input);
    const results = await lint(mode, logger, input?.additionalFlags ?? []);
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
