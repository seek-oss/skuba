#!/usr/bin/env node

/**
 * Entry point for the CLI.
 *
 * This is where you end up when you run:
 *
 * ```bash
 * [pnpm|yarn] skuba help
 * ```
 */

import path from 'path';

import { parseProcessArgs } from './utils/args.js';
import {
  COMMAND_DIR,
  COMMAND_SET,
  type Command,
  commandToModule,
} from './utils/command.js';
import { isCiEnv } from './utils/env.js';
import { handleCliError } from './utils/error.js';
import { showHelp } from './utils/help.js';
import { log } from './utils/logging.js';
import { showLogoAndVersionInfo } from './utils/logo.js';
import { isObject } from './utils/validation.js';

const THIRTY_MINUTES = 30 * 60 * 1000;

const skuba = async () => {
  const { commandName } = parseProcessArgs(process.argv);

  if (COMMAND_SET.has(commandName)) {
    const moduleName = commandToModule(commandName as Command);

    const commandModule = (await import(
      path.join(COMMAND_DIR, moduleName, 'index.js')
    )) as unknown;

    if (!isObject(commandModule) || !(moduleName in commandModule)) {
      log.err(log.bold(commandName), "couldn't run! Please submit an issue.");
      process.exitCode = 1;
      return;
    }

    const run = commandModule[moduleName] as () => Promise<unknown>;

    if (commandModule.longRunning) {
      // This is a long-running command, so we don't want to impose a timeout.
      return run();
    }

    // If we're not in a CI environment, we don't need to worry about timeouts, which are primarily to prevent
    // builds running "forever" in CI without our knowledge.
    // Local commands may run for a long time, e.g. `skuba start` or `skuba test --watch`, which are unlikely to be used in CI.
    if (!isCiEnv() || process.env.SKUBA_NO_TIMEOUT === 'true') {
      return run();
    }

    const timeoutId = setTimeout(
      () => {
        log.err(
          log.bold(commandName),
          'timed out. This may indicate a process hanging - please file an issue.',
        );

        // Need to force exit because promises may be hanging so node won't exit on its own.
        process.exit(1);
      },
      process.env.SKUBA_TIMEOUT_MS
        ? parseInt(process.env.SKUBA_TIMEOUT_MS, 10)
        : THIRTY_MINUTES,
    );

    return run().finally(() => clearTimeout(timeoutId));
  }

  log.err(log.bold(commandName), 'is not recognised as a command.');
  await showLogoAndVersionInfo();
  showHelp();

  process.exitCode = 1;
  return;
};

skuba().catch(handleCliError);
