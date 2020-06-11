#!/usr/bin/env node

import path from 'path';

import { parseArgs } from './utils/args';
import { COMMAND_DIR, COMMAND_SET } from './utils/command';
import { handleCliError } from './utils/error';
import { showHelp } from './utils/help';
import { log } from './utils/logging';
import { showLogo } from './utils/logo';
import { hasProp } from './utils/validation';

const skuba = async () => {
  const { command } = parseArgs(process.argv);

  if (COMMAND_SET.has(command)) {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const commandModule = require(path.join(COMMAND_DIR, command)) as unknown;

    if (!hasProp(commandModule, command)) {
      log.err(log.bold(command), "couldn't run! Please submit an issue.");
      process.exit(1);
    }

    const run = commandModule[command] as () => Promise<unknown>;

    return run();
  }

  log.err(log.bold(command), 'is not recognised as a command.');
  await showLogo();
  showHelp();

  process.exit(1);
};

skuba().catch(handleCliError);
