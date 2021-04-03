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

import { parseProcessArgs } from './utils/args.js';
import { COMMAND_DIR, COMMAND_SET, commandToModule } from './utils/command.js';
import { handleCliError } from './utils/error.js';
import { showHelp } from './utils/help.js';
import { log } from './utils/logging.js';
import { showLogoAndVersionInfo } from './utils/logo.js';

const skuba = async () => {
  const { commandName } = parseProcessArgs(process.argv);

  if (COMMAND_SET.has(commandName)) {
    const moduleName = commandToModule(commandName);
    const modulePath = path.join(COMMAND_DIR, `${moduleName}.js`);

    const commandModule = await import(modulePath);

    let run: () => Promise<unknown>;
    try {
      run = commandModule[moduleName];
    } catch (err) {
      log.err(log.bold(commandName), "couldn't run! Please submit an issue.");
      process.exit(1);
    }

    return run();
  }

  log.err(log.bold(commandName), 'is not recognised as a command.');
  await showLogoAndVersionInfo();
  showHelp();

  process.exit(1);
};

skuba().catch(handleCliError);
