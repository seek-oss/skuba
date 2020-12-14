#!/usr/bin/env node

/**
 * Entry point for the CLI.
 *
 * This is where you end up when you run:
 *
 * ```bash
 * [yarn] skuba help
 * ```
 */

import path from 'path';

import { parseArgs } from './utils/args';
import { COMMAND_DIR, COMMAND_SET, commandToModule } from './utils/command';
import { handleCliError } from './utils/error';
import { showHelp } from './utils/help';
import { log } from './utils/logging';
import { showLogoAndVersionInfo } from './utils/logo';
import { hasProp } from './utils/validation';

const skuba = async () => {
  const { commandName } = parseArgs(process.argv);

  if (COMMAND_SET.has(commandName)) {
    const moduleName = commandToModule(commandName);

    /* eslint-disable @typescript-eslint/no-var-requires */
    const commandModule = require(path.join(
      COMMAND_DIR,
      moduleName,
    )) as unknown;

    if (!hasProp(commandModule, moduleName)) {
      log.err(log.bold(commandName), "couldn't run! Please submit an issue.");
      process.exit(1);
    }

    const run = commandModule[moduleName] as () => Promise<unknown>;

    return run();
  }

  log.err(log.bold(commandName), 'is not recognised as a command.');
  await showLogoAndVersionInfo();
  showHelp();

  process.exit(1);
};

skuba().catch(handleCliError);
