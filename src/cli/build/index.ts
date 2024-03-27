import { copyAssets } from './assets';
import { esbuild } from './esbuild';
import { runBuildTool } from './runner';
import { tsc } from './tsc';

export const build = async (args = process.argv.slice(2)) =>
  runBuildTool(
    {
      esbuild: async ({ compilerOptions, ...params }) => {
        await esbuild({ ...params, compilerOptions, mode: 'build' }, args);

        if (compilerOptions.outDir) {
          await copyAssets(compilerOptions.outDir);
        }
      },

      tsc: async ({ compilerOptions }) => {
        await tsc(args);

        if (compilerOptions.outDir) {
          await copyAssets(compilerOptions.outDir);
        }
      },
    },
    args,
  );
