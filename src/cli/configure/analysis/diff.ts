import chalk from 'chalk';

export const determineOperation = (
  oldData?: string,
  newData?: string,
): string => {
  if (oldData === undefined) {
    return chalk.green('A');
  }

  return newData === undefined ? chalk.red('D') : chalk.yellow('M');
};
