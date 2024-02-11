import { log } from '../../utils/logging';

import { CURRENT_NODE_LTS, nodeVersionMigration } from './nodeVersion';

interface MigrationBase<T extends unknown[]> {
  migrate: (...args: T) => Promise<void>;
  getArgs: (args: string[]) => T;
}

// If adding other migrations this will need to be unioned together with the other formats (fixme if you can think of a better way)
type Migration = MigrationBase<[number]>;

const migrations: Record<string, Migration> = {
  'node-version': {
    migrate: nodeVersionMigration,
    getArgs: (args: string[]): [number] => {
      if (args.length === 0) return [CURRENT_NODE_LTS];

      const version = Number(args[0]);
      if (Number.isNaN(version)) {
        log.err('Provide a valid Node.js version to migrate to.');
        process.exit(1);
      }

      return [version];
    },
  },
};

const logAvailableMigrations = () => {
  log.ok('Available migrations:');
  Object.keys(migrations).forEach((migration) => {
    log.ok(`- ${migration}`);
  });
};

export const migrate = async (args = process.argv.slice(2)) => {
  if (!args[0]) {
    log.err('Provide a migration to run.');
    logAvailableMigrations();
    process.exitCode = 1;
    return;
  }

  if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
    logAvailableMigrations();
    return;
  }

  const migration = migrations[args[0]];

  if (!migration) {
    log.err(`Migration "${args[0]}" is not a valid option.`);
    logAvailableMigrations();
    process.exitCode = 1;
    return;
  }

  await migration.migrate(...migration.getArgs(args.slice(1)));
};
