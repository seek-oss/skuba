/* eslint-disable no-console */

import chalk from 'chalk';

export type Logger = typeof log;

export const createLogger = ({
  debug,
  prefixes = [],
  suffixes = [],
}: {
  debug: boolean;
  prefixes?: unknown[];
  suffixes?: unknown[];
}) => {
  const logWithoutSuffixes = (...message: unknown[]) =>
    console.log(...prefixes, ...message);

  const log = (...message: unknown[]) =>
    logWithoutSuffixes(...message, ...suffixes);

  return {
    settings: { debug, prefixes, suffixes },

    bold: chalk.bold,
    dim: chalk.dim,
    formatSubtle: chalk.grey,

    timing: (start: bigint, end: bigint) =>
      `${Number((end - start) / BigInt(10_000_000)) / 100}s`,

    debug: (...message: unknown[]) =>
      debug ? log(chalk.grey(...message)) : undefined,
    subtle: (...message: unknown[]) => log(chalk.grey(...message)),
    err: (...message: unknown[]) => log(chalk.red(...message)),
    newline: () => logWithoutSuffixes(),
    ok: (...message: unknown[]) => log(chalk.green(...message)),
    plain: (...message: unknown[]) => log(...message),
    warn: (...message: unknown[]) => log(chalk.yellow(...message)),
  };
};

export const log = createLogger({ debug: false });

export const childLogger = (
  logger: Logger,
  settings: Partial<Logger['settings']>,
) =>
  createLogger({
    debug: settings.debug ?? logger.settings.debug,
    prefixes: [...(settings.prefixes ?? []), ...logger.settings.prefixes],
    suffixes: [...logger.settings.suffixes, ...(settings.suffixes ?? [])],
  });

export const pluralise = (count: number, subject: string) =>
  `${count} ${subject}${count === 1 ? '' : 's'}`;
