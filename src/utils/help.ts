import chalk from 'chalk';

import { COMMAND_LIST } from './command';

export const showHelp = () => {
  console.info(chalk.bold('Available commands:'));

  COMMAND_LIST.forEach((item) => console.log(item));
};
