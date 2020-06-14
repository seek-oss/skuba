import chalk from 'chalk';

export const determineOperation = (
  oldData?: string,
  newData?: string,
): string => {
  if (typeof oldData === 'undefined') {
    return chalk.green('A');
  }

  return typeof newData === 'undefined' ? chalk.red('D') : chalk.yellow('M');
};
