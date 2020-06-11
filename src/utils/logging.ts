/* eslint-disable no-console */

import chalk from 'chalk';

export const log = {
  bold: chalk.bold,

  subtle: (...message: unknown[]) => console.log(chalk.grey(...message)),
  err: (...message: unknown[]) => console.error(chalk.red(...message)),
  newline: () => console.log(),
  ok: (...message: unknown[]) => console.log(chalk.green(...message)),
  plain: (...message: unknown[]) => console.log(...message),
  warn: (...message: unknown[]) => console.error(chalk.yellow(...message)),
};
