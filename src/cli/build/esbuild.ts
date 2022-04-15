import { inspect } from 'util';

import tsconfigPaths from '@esbuild-plugins/tsconfig-paths';
import { build } from 'esbuild';
import type { TsConfigJson } from 'type-fest';
import ts, { ModuleKind, ModuleResolutionKind } from 'typescript';

import { log } from '../../utils/logging';

import { parseTscArgs } from './args';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: ts.sys.getCurrentDirectory.bind(undefined),
  getNewLine: () => ts.sys.newLine,
};

export const esbuild = async (args = process.argv.slice(2)) => {
  const tscArgs = parseTscArgs(args);

  if (tscArgs.build) {
    log.err(
      'skuba does not currently support the tsc --build flag with esbuild',
    );
    process.exitCode = 1;
    return;
  }

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

  const tsconfig = readConfigFile.config as TsConfigJson;

  const parsedCommandLine = ts.parseJsonConfigFileContent(
    tsconfig,
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

  // TODO: propagate debug logger
  log.debug('Files');
  entryPoints.forEach((filepath) => log.debug(filepath));

  log.debug('Compiler options');
  log.debug(inspect(compilerOptions));

  // TODO: do we need to check both of these?
  const isNode =
    compilerOptions.module === ModuleKind.CommonJS ||
    compilerOptions.moduleResolution === ModuleResolutionKind.NodeJs;

  await build({
    // TODO: make these configurable
    bundle: false,

    // TODO: investigate incremental builds
    // incremental: true

    // TODO: figure out CJS vs ESM
    ...(isNode ? { format: 'cjs', platform: 'node' } : null),

    entryPoints,
    outdir: compilerOptions.outDir,
    plugins: [tsconfigPaths({ tsconfig })],
    sourcemap: compilerOptions.sourceMap,
    tsconfig: tscArgs.pathname,
  });

  if (compilerOptions.declaration) {
    const { tsc } = await import('./tsc');

    await tsc(['--declaration', '--emitDeclarationOnly']);
  }
};
