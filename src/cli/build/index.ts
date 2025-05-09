import chalk from 'chalk';

import { loadSkubaConfig } from '../../config/load';
import { hasDebugFlag } from '../../utils/args';
import { log } from '../../utils/logging';

import { copyAssets } from './assets';
import { esbuild } from './esbuild';
import { readTsconfig, tsc } from './tsc';

export const build = async (args = process.argv.slice(2)) => {
  const tool = (await loadSkubaConfig()).buildTool;

  switch (tool) {
    case 'esbuild': {
      const debug = hasDebugFlag(args);

      log.plain(chalk.yellow('esbuild'));
      await esbuild({ debug }, args);
      break;
    }

    case 'tsc': {
      log.plain(chalk.blue('tsc'));
      await tsc(args);
      break;
    }
  }

  const parsedCommandLine = readTsconfig(args, log);

  if (!parsedCommandLine || process.exitCode) {
    return;
  }

  const { options: compilerOptions } = parsedCommandLine;

  if (!compilerOptions.outDir) {
    return;
  }

  await copyAssets(compilerOptions.outDir);
};
