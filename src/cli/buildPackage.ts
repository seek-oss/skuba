import { hasSerialFlag } from '../utils/args';
import { execConcurrently } from '../utils/exec';

import { copyAssetsConcurrently } from './build/assets';

export const buildPackage = async (args = process.argv.slice(2)) => {
  await execConcurrently(
    [
      {
        command:
          'tsc --module Node16 --outDir lib-commonjs --project tsconfig.build.json',
        name: 'commonjs',
        prefixColor: 'green',
      },
      {
        command:
          'tsc --module ES2022 --outDir lib-esm --project tsconfig.build.json',
        name: 'esm',
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
      outDir: 'lib-esm',
      name: 'esm',
      prefixColor: 'yellow',
    },
  ]);
};
