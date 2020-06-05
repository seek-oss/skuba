#!/usr/bin/env node

import path from 'path';

import chalk from 'chalk';

import { parseArgs } from './utils/args';
import { COMMAND_DIR, COMMAND_SET } from './utils/command';
import { handleCliError } from './utils/error';
import { showHelp } from './utils/help';
import { showLogo } from './utils/logo';

const skuba = async () => {
  const { command } = parseArgs(process.argv);

  if (COMMAND_SET.has(command)) {
    return require(path.join(COMMAND_DIR, command));
  }

  console.error(chalk.red(`Unknown command: '${command}'`));
  await showLogo();
  showHelp();

  process.exit(1);
};

skuba().catch(handleCliError);
