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

import { parseProcessArgs } from './utils/args';
import {
  COMMAND_DIR,
  COMMAND_SET,
  type Command,
  commandToModule,
} from './utils/command';
import { isCiEnv } from './utils/env';
import { handleCliError } from './utils/error';
import { showHelp } from './utils/help';
import { log } from './utils/logging';
import { showLogoAndVersionInfo } from './utils/logo';
import { hasProp } from './utils/validation';

const THIRTY_MINUTES = 30 * 60 * 1000;

const skuba = async () => {
  const { commandName } = parseProcessArgs(process.argv);

  if (COMMAND_SET.has(commandName)) {
    const moduleName = commandToModule(commandName as Command);

    /* eslint-disable @typescript-eslint/no-var-requires */
    const commandModule = require(
      path.join(COMMAND_DIR, moduleName),
    ) as unknown;

    if (!hasProp(commandModule, moduleName)) {
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
