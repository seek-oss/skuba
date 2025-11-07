/* eslint-disable no-console */

import { styleText } from 'node:util';

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

    bold: (text: string) => styleText('bold', text),
    dim: (text: string) => styleText('dim', text),
    formatSubtle: (text: string) => styleText('gray', text),

    timing: (start: bigint, end: bigint) =>
      `${Number((end - start) / BigInt(10_000_000)) / 100}s`,

    debug: (...message: unknown[]) =>
      debug
        ? log(...message.map((m) => styleText('gray', String(m))))
        : undefined,
    subtle: (...message: unknown[]) =>
      log(...message.map((m) => styleText('gray', String(m)))),
    err: (...message: unknown[]) =>
      log(...message.map((m) => styleText('red', String(m)))),
    newline: () => logWithoutSuffixes(),
    ok: (...message: unknown[]) =>
      log(...message.map((m) => styleText('green', String(m)))),
    plain: (...message: unknown[]) => log(...message),
    warn: (...message: unknown[]) =>
      log(...message.map((m) => styleText('yellow', String(m)))),
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
