import chalk from 'chalk';

import { hasDebugFlag } from '../../utils/args';
import { log } from '../../utils/logging';
import {
  getBooleanPropFromConsumerManifest,
  getStringPropFromConsumerManifest,
} from '../../utils/manifest';

import { esbuild } from './esbuild';
import { tsc } from './tsc';

export const build = async (args = process.argv.slice(2)) => {
  const tool = await getStringPropFromConsumerManifest('build');

  switch (tool) {
    case 'esbuild': {
      // TODO: define a unified `package.json#/skuba` schema and parser so we
      // don't need all these messy lookups.
      const bundle =
        (await getBooleanPropFromConsumerManifest('bundle')) ?? false;

      const debug = hasDebugFlag(args);

      log.plain(chalk.yellow('esbuild'));
      await esbuild({ bundle, debug }, args);
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
