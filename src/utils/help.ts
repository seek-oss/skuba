import { COMMAND_LIST } from './command.ts';
import { log } from './logging.ts';

export const showHelp = async (command?: string) => {
  switch (command) {
    case 'init': {
      const { logInitHelp } = await import('../cli/init/help.ts');
      logInitHelp();
      return;
    }
    case 'migrate': {
      const { logAvailableMigrations } =
        await import('../cli/migrate/index.ts');

      logAvailableMigrations();
      return;
    }
  }

  log.plain(log.bold('Available commands:'));

  COMMAND_LIST.forEach((item) => log.plain(item));
};
