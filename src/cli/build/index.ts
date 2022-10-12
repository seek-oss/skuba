import chalk from 'chalk';

import { hasDebugFlag } from '../../utils/args';
import { log } from '../../utils/logging';
import { getStringPropFromConsumerManifest } from '../../utils/manifest';
import { tryAddEmptyExports } from '../configure/addEmptyExports';

import { esbuild } from './esbuild';
import { tsc } from './tsc';

export const build = async (args = process.argv.slice(2)) => {
  await tryAddEmptyExports();

  // TODO: define a unified `package.json#/skuba` schema and parser so we don't
  // need all these messy lookups.
  const tool = await getStringPropFromConsumerManifest('build');

  switch (tool) {
    case 'esbuild': {
      const debug = hasDebugFlag(args);

      log.plain(chalk.yellow('esbuild'));
      await esbuild({ debug }, args);
      return;
    }

    // TODO: flip the default case over to `esbuild` in skuba v5.
    case undefined:
    case 'tsc': {
      log.plain(chalk.blue('tsc'));
      await tsc(args);
      return;
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
