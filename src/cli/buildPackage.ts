import type { CompilerOptions } from 'typescript';

import { hasSerialFlag } from '../utils/args';
import { execConcurrently } from '../utils/exec';

import { copyAssets, copyAssetsConcurrently } from './build/assets';
import { type EsbuildParameters, esbuild as runEsbuild } from './build/esbuild';
import { runBuildTool } from './build/runner';

export const buildPackage = async (args = process.argv.slice(2)) =>
  runBuildTool({ esbuild, tsc }, args);

const esbuild = async (
  { compilerOptions, ...params }: Omit<EsbuildParameters, 'mode'>,
  args: string[],
) => {
  await runEsbuild({ ...params, compilerOptions, mode: 'build-package' }, args);

  if (compilerOptions.outDir) {
    await copyAssets(compilerOptions.outDir);
  }
};

const tsc = async (
  { compilerOptions }: { compilerOptions: CompilerOptions },
  args: string[],
) => {
  const removeComments = compilerOptions.removeComments ?? false;

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
        command: `tsc --allowJS false --declaration --emitDeclarationOnly --outDir lib-types --project tsconfig.build.json --removeComments ${removeComments}`,
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
