import { inspect } from 'util';

import tsconfigPaths from '@esbuild-plugins/tsconfig-paths';
import { type BuildOptions, build } from 'esbuild';
import { type CompilerOptions, ModuleKind, ScriptTarget } from 'typescript';

import { parseTscArgs } from './args';
import type { RunnerParams } from './runner';
import { tsc } from './tsc';

export type EsbuildParameters = RunnerParams & {
  mode: 'build' | 'build-package';
};

export const esbuild = async (
  { compilerOptions, debug, entryPoints, log, mode }: EsbuildParameters,
  args = process.argv.slice(2),
) => {
  const tscArgs = parseTscArgs(args);

  if (tscArgs.build) {
    log.err(
      'skuba does not currently support the tsc --build flag with esbuild',
    );
    process.exitCode = 1;
    return;
  }

  log.debug(log.bold('Files'));
  entryPoints.forEach((filepath) => log.debug(filepath));

  log.debug(log.bold('Compiler options'));
  log.debug(inspect(compilerOptions));

  const start = process.hrtime.bigint();

  switch (mode) {
    case 'build':
      await runBuild({
        compilerOptions,
        debug,
        entryPoints,
        tsconfig: tscArgs.pathname,
      });

      break;

    case 'build-package':
      await runBuild({
        bundle: true,
        compilerOptions: {
          ...compilerOptions,
          module: ModuleKind.ESNext,
        },
        debug,
        entryPoints,
        outExtension: { '.js': '.mjs' },
        tsconfig: tscArgs.pathname,
      });

      await runBuild({
        bundle: true,
        compilerOptions: {
          ...compilerOptions,
          module: ModuleKind.NodeNext,
        },
        debug,
        entryPoints,
        outExtension: { '.js': '.js' },
        tsconfig: tscArgs.pathname,
      });

      break;
  }

  const end = process.hrtime.bigint();

  log.plain(`Built in ${log.timing(start, end)}.`);

  if (compilerOptions.declaration || mode === 'build-package') {
    const removeComments = compilerOptions.removeComments ?? false;

    await tsc([
      '--declaration',
      '--emitDeclarationOnly',
      ...(tscArgs.project ? ['--project', tscArgs.project] : []),
      '--removeComments',
      removeComments.toString(),
    ]);
  }
};

const ES_MODULE_KINDS = new Set<ModuleKind | undefined>([
  ModuleKind.ES2015,
  ModuleKind.ES2020,
  ModuleKind.ES2022,
  ModuleKind.ESNext,
]);

const NODE_MODULE_KINDS = new Set<ModuleKind | undefined>([
  ModuleKind.CommonJS,
  ModuleKind.Node16,
  ModuleKind.NodeNext,
]);

const mapModule = (
  compilerOptions: CompilerOptions,
): Pick<BuildOptions, 'format' | 'platform'> => {
  if (NODE_MODULE_KINDS.has(compilerOptions.module)) {
    return { format: 'cjs', platform: 'node' };
  }

  if (ES_MODULE_KINDS.has(compilerOptions.module)) {
    return { format: 'esm', platform: 'neutral' };
  }

  return { format: undefined, platform: undefined };
};

type RunEsbuildOptions = {
  bundle?: boolean;
  compilerOptions: Pick<
    CompilerOptions,
    'baseUrl' | 'module' | 'outDir' | 'paths' | 'sourceMap' | 'target'
  >;
  debug: boolean;
  entryPoints: string[];
  outExtension?: BuildOptions['outExtension'];
  tsconfig: string;
};

const runBuild = async ({
  bundle = false,
  compilerOptions,
  debug,
  entryPoints,
  outExtension,
  tsconfig,
}: RunEsbuildOptions) => {
  const { format, platform } = mapModule(compilerOptions);

  // TODO: support `minify`, `splitting`, `treeShaking`
  await build({
    bundle,
    entryPoints,
    format,
    outdir: compilerOptions.outDir,
    logLevel: debug ? 'debug' : 'info',
    logLimit: 0,
    outExtension,
    packages: 'external',
    platform,
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
    tsconfig,
  });
};
