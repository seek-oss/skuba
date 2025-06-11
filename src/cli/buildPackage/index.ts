import { hasSerialFlag } from '../../utils/args';
import { execConcurrently } from '../../utils/exec';
import { copyAssetsConcurrently } from '../build/assets';

export const buildPackage = async (args = process.argv.slice(2)) => {
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
