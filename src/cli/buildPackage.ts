import chalk from 'chalk';

import { hasDebugFlag, hasSerialFlag } from '../utils/args';
import { execConcurrently } from '../utils/exec';
import { log } from '../utils/logging';
import { getStringPropFromConsumerManifest } from '../utils/manifest';

import { esbuild } from './build/esbuild';
import { tsc } from './build/tsc';
import { tryAddEmptyExports } from './configure/addEmptyExports';

export const buildPackage = async (args = process.argv.slice(2)) => {
  await tryAddEmptyExports();

  // TODO: define a unified `package.json#/skuba` schema and parser so we don't
  // need all these messy lookups.
  const tool = await getStringPropFromConsumerManifest('build');

  switch (tool) {
    case 'esbuild': {
      const debug = hasDebugFlag(args);

      log.plain(chalk.yellow('esbuild'));
      // Keep execution and logging simple for now with serial execution.
      // This shouldn't be a large drag as esbuild is fast.
      await esbuild({ debug, packageMode: 'cjs' });
      await esbuild({ debug, packageMode: 'esm' });
      await tsc([
        '--allowJs',
        'false',
        '--declaration',
        '--emitDeclarationOnly',
        '--outDir',
        'lib',
        '--project',
        'tsconfig.build.json',
      ]);
      return;
    }

    // TODO: flip the default case over to `esbuild` in skuba v5.
    case undefined:
    case 'tsc': {
      log.plain(chalk.blue('tsc'));
      await execConcurrently(
        [
          {
            command:
              'tsc --module CommonJS --outDir lib-commonjs --project tsconfig.build.json',
            name: 'commonjs',
            prefixColor: 'green',
          },
          {
            command:
              'tsc --module ES2015 --outDir lib-es2015 --project tsconfig.build.json',
            name: 'es2015',
            prefixColor: 'yellow',
          },
          {
            command:
              'tsc --allowJS false --declaration --emitDeclarationOnly --outDir lib-types --project tsconfig.build.json',
            name: 'types',
            prefixColor: 'blue',
          },
        ],
        {
          maxProcesses: hasSerialFlag(args) ? 1 : undefined,
        },
      );
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
