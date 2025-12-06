import { log } from '../../utils/logging.js';

import { nodeVersionMigration } from './nodeVersion/index.js';

export const migrations = {
  node20: () =>
    nodeVersionMigration({
      nodeVersion: '20',
      ECMAScriptVersion: 'ES2023',
      packageNodeVersion: '16',
      packageEMCAScriptVersion: 'ES2021',
      infraPackages: [],
    }),
  node22: () =>
    nodeVersionMigration({
      nodeVersion: '22',
      ECMAScriptVersion: 'ES2024',
      packageNodeVersion: '18',
      packageEMCAScriptVersion: 'ES2022',
      infraPackages: [],
    }),
  node24: () =>
    nodeVersionMigration({
      nodeVersion: '24',
      ECMAScriptVersion: 'ES2024',
      packageNodeVersion: '20',
      packageEMCAScriptVersion: 'ES2023',
      infraPackages: [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'datadog-cdk-constructs-v2',
          version: '3.4.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'serverless-plugin-datadog',
          version: '5.114.0',
        },
        {
          name: '@types/node',
          version: '24.10.1',
        },
      ],
    }),
} satisfies Record<string, () => Promise<void>>;

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

  const migration = migrations[args[0] as keyof typeof migrations];

  if (!migration) {
    log.err(`Migration "${args[0]}" is not a valid option.`);
    logAvailableMigrations();
    process.exitCode = 1;
    return;
  }

  await migration();
};
