import chalk from 'chalk';

import { log } from '../../utils/logging';
import { getStringPropFromConsumerManifest } from '../../utils/manifest';

export const build = async () => {
  const tool = await getStringPropFromConsumerManifest('build');

  switch (tool) {
    case 'esbuild': {
      log.plain(chalk.yellow('esbuild'));
      const { esbuild } = await import('./esbuild');
      await esbuild();
      return;
    }

    // TODO: flip the default case over to `esbuild` in skuba 4.
    case undefined:
    case 'tsc': {
      log.plain(chalk.blue('tsc'));
      const { tsc } = await import('./tsc');
      await tsc();
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
