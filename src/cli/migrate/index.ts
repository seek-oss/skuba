import { log } from '../../utils/logging.js';

import { nodeVersionMigration } from './nodeVersion/index.js';

const migrations: Record<string, () => Promise<void>> = {
  node20: () =>
    nodeVersionMigration({
      nodeVersion: 20,
      ECMAScriptVersion: 'ES2023',
    }),
  node22: () =>
    nodeVersionMigration({
      nodeVersion: 22,
      ECMAScriptVersion: 'ES2024',
    }),
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

  await migration();
};
