/* eslint-disable no-console */

import chalk from 'chalk';

export type Logger = typeof log;

export const createLogger = (debug: boolean, ...prefixes: unknown[]) => {
  const log = (...message: unknown[]) => console.log(...prefixes, ...message);

  return {
    bold: chalk.bold,
    formatSubtle: chalk.grey,

    debug: (...message: unknown[]) =>
      debug ? log(chalk.grey(...message)) : undefined,
    subtle: (...message: unknown[]) => log(chalk.grey(...message)),
    err: (...message: unknown[]) => log(chalk.red(...message)),
    newline: () => log(),
    ok: (...message: unknown[]) => log(chalk.green(...message)),
    plain: (...message: unknown[]) => log(...message),
    warn: (...message: unknown[]) => log(chalk.yellow(...message)),
  };
};

export const log = createLogger(false);
