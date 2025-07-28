import { COMMAND_LIST } from './command.js';
import { log } from './logging.js';

export const showHelp = () => {
  log.plain(log.bold('Available commands:'));

  COMMAND_LIST.forEach((item) => log.plain(item));
};
