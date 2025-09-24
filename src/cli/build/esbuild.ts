import { inspect } from 'util';

import tsconfigPaths from '@esbuild-plugins/tsconfig-paths';
import { build } from 'esbuild';
import { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript';

import { createLogger } from '../../utils/logging.js';

import { parseTscArgs } from './args.js';
import { readTsBuildConfig, tsc } from './tsc.js';

interface EsbuildParameters {
  debug: boolean;
  type: string | undefined;
}

export const esbuild = async (
  { debug, type }: EsbuildParameters,
  args = process.argv.slice(2),
) => {
  const log = createLogger({ debug });

  const tscArgs = parseTscArgs(args);

  if (tscArgs.build) {
    log.err(
      'skuba does not currently support the tsc --build flag with esbuild',
    );
    process.exitCode = 1;
    return;
  }

  const parsedCommandLine = readTsBuildConfig(args, log);

  if (!parsedCommandLine || process.exitCode) {
    return;
  }

  const { fileNames: entryPoints, options: compilerOptions } =
    parsedCommandLine;

  log.debug(log.bold('Files'));
  entryPoints.forEach((filepath) => log.debug(filepath));

  log.debug(log.bold('Compiler options'));
  log.debug(inspect(compilerOptions));

  const start = process.hrtime.bigint();

  // TODO: support `bundle`, `minify`, `splitting`, `treeShaking`
  const bundle = false;

  const isEsm =
    compilerOptions.module !== ModuleKind.CommonJS && type === 'module';

  await build({
    bundle,
    entryPoints,
    format: !isEsm ? 'cjs' : undefined,
    outdir: compilerOptions.outDir,
    logLevel: debug ? 'debug' : 'info',
    logLimit: 0,
    platform:
      compilerOptions.moduleResolution === ModuleResolutionKind.NodeJs ||
      compilerOptions.moduleResolution === ModuleResolutionKind.Node16
        ? 'node'
        : undefined,
    plugins: bundle
      ? []
      : [
          // evanw/esbuild#394
          tsconfigPaths({
            tsconfig: { baseUrl: compilerOptions.baseUrl, compilerOptions },
          }),
        ],
    sourcemap: compilerOptions.sourceMap,
    // TODO: as of 0.18, the esbuild CLI no longer infers the target property to
    // avoid ambiguity where multiple `tsconfig.json`s are involved in a build.
    // This would be unusual for a typical SEEK project but we can still explore
    // an explicit setting once we implement `skuba.config.ts` (#1167).
    target: compilerOptions.target
      ? ScriptTarget[compilerOptions.target].toLocaleLowerCase()
      : undefined,
    tsconfig: tscArgs.pathname,
  });

  const end = process.hrtime.bigint();

  log.plain(`Built in ${log.timing(start, end)}.`);

  if (compilerOptions.declaration) {
    await tsc([
      '--declaration',
      '--emitDeclarationOnly',
      ...(tscArgs.project ? ['--project', tscArgs.project] : []),
    ]);
  }
};
