import chalk from 'chalk';

import { hasDebugFlag, hasSerialFlag } from '../utils/args';
import { execConcurrently } from '../utils/exec';
import { type Logger, createLogger } from '../utils/logging';
import { getStringPropFromConsumerManifest } from '../utils/manifest';

import { copyAssets, copyAssetsConcurrently } from './build/assets';
import { EsbuildParameters, esbuild } from './build/esbuild';
import { readTsconfig } from './build/tsc';

export const buildPackage = async (args = process.argv.slice(2)) => {
  const debug = hasDebugFlag(args);

  const log = createLogger(debug);

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
      log.plain(chalk.yellow('esbuild'));
      await runEsbuild({ compilerOptions, debug, entryPoints, log }, args);
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
};

const runEsbuild = async (
  { compilerOptions, ...params }: Omit<EsbuildParameters, 'mode'>,
  args: string[],
) => {
  await esbuild({ ...params, compilerOptions, mode: 'build-package' }, args);

  if (compilerOptions.outDir) {
    await copyAssets(compilerOptions.outDir);
  }
};

const tsc = async (args: string[]) => {
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

  await copyAssetsConcurrently([
    {
      outDir: 'lib-commonjs',
      name: 'commonjs',
      prefixColor: 'green',
    },
    {
      outDir: 'lib-es2015',
      name: 'es2015',
      prefixColor: 'yellow',
    },
  ]);
};
