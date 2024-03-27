import chalk from 'chalk';

import { hasDebugFlag } from '../../utils/args';
import { log } from '../../utils/logging';
import { getStringPropFromConsumerManifest } from '../../utils/manifest';

import { copyAssets } from './assets';
import { esbuild } from './esbuild';
import { readTsconfig, tsc } from './tsc';

export const build = async (args = process.argv.slice(2)) => {
  const parsedCommandLine = readTsconfig(args, log);

  if (!parsedCommandLine) {
    process.exitCode = 1;
    return;
  }

  const { compilerOptions, entryPoints } = parsedCommandLine;

  // TODO: define a unified `package.json#/skuba` schema and parser so we don't
  // need all these messy lookups.
  const tool = await getStringPropFromConsumerManifest('build');

  switch (tool) {
    case 'esbuild': {
      const debug = hasDebugFlag(args);

      log.plain(chalk.yellow('esbuild'));
      await esbuild(
        { compilerOptions, debug, entryPoints, log, mode: 'build' },
        args,
      );
      break;
    }

    // TODO: flip the default case over to `esbuild` in skuba vNext.
    case undefined:
    case 'tsc': {
      log.plain(chalk.blue('tsc'));
      await tsc(args);
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

  if (compilerOptions.outDir) {
    await copyAssets(compilerOptions.outDir);
  }
};
