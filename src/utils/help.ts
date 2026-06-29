import { COMMAND_LIST } from './command.js';
import { log } from './logging.js';

export const showHelp = async (command?: string) => {
  switch (command) {
    case 'init': {
      const { logInitHelp } = await import('../cli/init/help.js');
      logInitHelp();
      return;
    }
    case 'migrate': {
      const { logAvailableMigrations } =
        await import('../cli/migrate/index.js');

      logAvailableMigrations();
      return;
    }
  }

  log.plain(log.bold('Available commands:'));

  COMMAND_LIST.forEach((item) => log.plain(item));
};
