#!/usr/bin/env node

import path from 'path';

import chalk from 'chalk';

import { parseArgs } from './utils/args';
import { COMMAND_DIR, COMMAND_SET } from './utils/command';
import { handleCliError } from './utils/error';
import { showHelp } from './utils/help';
import { showLogo } from './utils/logo';
import { isObjectWithProp } from './utils/validation';

const skuba = async () => {
  const { command } = parseArgs(process.argv);

  if (COMMAND_SET.has(command)) {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const commandModule = require(path.join(COMMAND_DIR, command)) as unknown;

    if (!isObjectWithProp(commandModule, command)) {
      console.error(
        chalk.red(
          `Couldn’t run ${chalk.bold(
            `skuba ${command}`,
          )}! Please file an issue.`,
        ),
      );
      process.exit(1);
    }

    const run = commandModule[command] as () => Promise<unknown>;

    return run();
  }

  console.error(chalk.red(`Unknown command: '${command}'`));
  await showLogo();
  showHelp();

  process.exit(1);
};

skuba().catch(handleCliError);
