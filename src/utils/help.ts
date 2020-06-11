import { COMMAND_LIST } from './command';
import { log } from './logging';

export const showHelp = () => {
  log.plain(log.bold('Available commands:'));

  COMMAND_LIST.forEach((item) => log.plain(item));
};
