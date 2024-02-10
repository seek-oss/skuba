import { log } from '../../utils/logging';

import { CURRENT_NODE_LTS, nodeVersionMigration } from './nodeVersion';

const migrations = {
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

type Migration = keyof typeof migrations;

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

  if (!migrations[args[0] as Migration]) {
    log.err(`Migration "${args[0]}" is not a valid option.`);
    logAvailableMigrations();
    process.exitCode = 1;
    return;
  }

  const migration = migrations[args[0] as Migration];

  await migration.migrate(...migration.getArgs(args.slice(1)));
};
