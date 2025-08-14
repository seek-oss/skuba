import chalk from 'chalk';

import { hasDebugFlag } from '../../utils/args.js';
import { log } from '../../utils/logging.js';
import { getStringPropFromConsumerManifest } from '../../utils/manifest.js';

import { copyAssets } from './assets.js';
import { esbuild } from './esbuild.js';
import { readTsBuildConfig, tsc } from './tsc.js';

export const build = async (args = process.argv.slice(2)) => {
  // TODO: define a unified `package.json#/skuba` schema and parser so we don't
  // need all these messy lookups.
  const tool = await getStringPropFromConsumerManifest('build');

  switch (tool) {
    case 'esbuild': {
      const debug = hasDebugFlag(args);

      log.plain(chalk.yellow('esbuild'));
      await esbuild({ debug }, args);
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

  const parsedCommandLine = readTsBuildConfig(args, log);

  if (!parsedCommandLine || process.exitCode) {
    return;
  }

  const { options: compilerOptions } = parsedCommandLine;

  if (!compilerOptions.outDir) {
    return;
  }

  await copyAssets(compilerOptions.outDir);
};
