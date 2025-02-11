import chalk from 'chalk';
import type { CompilerOptions } from 'typescript';

import { hasDebugFlag } from '../../utils/args';
import { type Logger, createLogger } from '../../utils/logging';
import { getStringPropFromConsumerManifest } from '../../utils/manifest';

import { readTsconfig } from './tsc';

export type RunnerParams = {
  compilerOptions: CompilerOptions;
  debug: boolean;
  entryPoints: string[];
  log: Logger;
};

type RunBuildToolParams = {
  esbuild: (params: RunnerParams, args: string[]) => Promise<void>;
  tsc: (params: RunnerParams, args: string[]) => Promise<void>;
};

export const runBuildTool = async (run: RunBuildToolParams, args: string[]) => {
  const debug = hasDebugFlag(args);

  const log = createLogger(debug);

  const tsconfig = readTsconfig(args, log);

  if (!tsconfig) {
    process.exitCode = 1;
    return;
  }

  const { compilerOptions, entryPoints } = tsconfig;

  const params = { compilerOptions, debug, entryPoints, log };

  // TODO: define a unified `package.json#/skuba` schema and parser so we don't
  // need all these messy lookups.
  const tool = await getStringPropFromConsumerManifest('build');

  switch (tool) {
    case 'esbuild': {
      log.plain(chalk.yellow('esbuild'));
      await run.esbuild(params, args);
      break;
    }

    // TODO: flip the default case over to `esbuild` in skuba vNext.
    case undefined:
    case 'tsc': {
      log.plain(chalk.blue('tsc'));
      await run.tsc(params, args);
      break;
    }

    default: {
      log.err(
        'We don’t support the build tool specified in your',
        log.bold('package.json'),
        'yet:',
      );
      log.err(log.subtle(JSON.stringify({ skuba: { build: tool } }, null, 2)));
      process.exitCode = 1;
      return;
    }
  }
};
