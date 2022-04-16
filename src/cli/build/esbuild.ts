import { inspect } from 'util';

import tsconfigPaths from '@esbuild-plugins/tsconfig-paths';
import { build } from 'esbuild';
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript';

import { createLogger } from '../../utils/logging';

import { parseTscArgs } from './args';
import { tsc } from './tsc';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: ts.sys.getCurrentDirectory.bind(undefined),
  getNewLine: () => ts.sys.newLine,
};

interface EsbuildParameters {
  bundle: boolean;
  debug: boolean;
}

export const esbuild = async (
  { bundle, debug }: EsbuildParameters,
  args = process.argv.slice(2),
) => {
  const log = createLogger(debug);

  const tscArgs = parseTscArgs(args);

  if (tscArgs.build) {
    log.err(
      'skuba does not currently support the tsc --build flag with esbuild',
    );
    process.exitCode = 1;
    return;
  }

  log.debug(
    log.bold(
      'tsconfig',
      ...(tscArgs.project ? ['--project', tscArgs.project] : []),
    ),
  );
  log.debug(tscArgs.pathname);

  const tsconfigFile = ts.findConfigFile(
    tscArgs.dirname,
    ts.sys.fileExists.bind(undefined),
    tscArgs.basename,
  );
  if (!tsconfigFile) {
    log.err(`Could not find ${tscArgs.pathname}.`);
    process.exitCode = 1;
    return;
  }

  const readConfigFile = ts.readConfigFile(
    tsconfigFile,
    ts.sys.readFile.bind(undefined),
  );
  if (readConfigFile.error) {
    log.err(`Could not read ${tscArgs.pathname}.`);
    log.subtle(ts.formatDiagnostic(readConfigFile.error, formatHost));
    process.exitCode = 1;
    return;
  }

  const parsedCommandLine = ts.parseJsonConfigFileContent(
    readConfigFile.config,
    ts.sys,
    tscArgs.dirname,
  );

  if (parsedCommandLine.errors.length) {
    log.err(`Could not parse ${tscArgs.pathname}.`);
    log.subtle(ts.formatDiagnostics(parsedCommandLine.errors, formatHost));
    process.exitCode = 1;
    return;
  }

  const { fileNames: entryPoints, options: compilerOptions } =
    parsedCommandLine;

  log.debug(log.bold('Files'));
  entryPoints.forEach((filepath) => log.debug(filepath));

  log.debug(log.bold('Compiler options'));
  log.debug(inspect(compilerOptions));

  const start = process.hrtime.bigint();

  await build({
    bundle,
    entryPoints,
    format: compilerOptions.module === ModuleKind.CommonJS ? 'cjs' : undefined,
    outdir: compilerOptions.outDir,
    logLevel: debug ? 'debug' : 'info',
    platform:
      compilerOptions.moduleResolution === ModuleResolutionKind.NodeJs
        ? 'node'
        : undefined,
    plugins: [
      tsconfigPaths({
        tsconfig: { baseUrl: compilerOptions.baseUrl, compilerOptions },
      }),
    ],
    sourcemap: compilerOptions.sourceMap,
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
