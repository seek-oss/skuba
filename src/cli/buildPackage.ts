import chalk from 'chalk';

import { hasSerialFlag } from '../utils/args';
import { execConcurrently } from '../utils/exec';
import { createLogger } from '../utils/logging';

import { copyAssets } from './build/assets';
import { tryAddEmptyExports } from './configure/addEmptyExports';

export const buildPackage = async (args = process.argv.slice(2)) => {
  await tryAddEmptyExports();

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

  await Promise.all([
    copyAssets('lib-commonjs', createLogger(false, chalk.green('commonjs │'))),
    copyAssets('lib-es2015', createLogger(false, chalk.yellow('es2015   │'))),
  ]);
};
