import { inspect } from 'util';

import tsconfigPaths from '@esbuild-plugins/tsconfig-paths';
import { build } from 'esbuild';
import type { TsConfigJson } from 'type-fest';
import ts, { ModuleKind, ModuleResolutionKind } from 'typescript';

import { log } from '../../utils/logging';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (path) => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory.bind(undefined),
  getNewLine: () => ts.sys.newLine,
};

export const esbuild = async () => {
  const currentDir = process.cwd();

  // TODO: support `--project` option
  const tsconfigFilepath = 'tsconfig.build.json';

  const tsconfigFile = ts.findConfigFile(
    currentDir,
    ts.sys.fileExists.bind(undefined),
    tsconfigFilepath,
  );
  if (!tsconfigFile) {
    log.err(`Could not find ${tsconfigFilepath}.`);
    process.exitCode = 1;
    return;
  }

  const readConfigFile = ts.readConfigFile(
    tsconfigFile,
    ts.sys.readFile.bind(undefined),
  );
  if (readConfigFile.error) {
    log.err(`Could not read ${tsconfigFilepath}.`);
    log.subtle(ts.formatDiagnostic(readConfigFile.error, formatHost));
    process.exitCode = 1;
    return;
  }

  const tsconfig = readConfigFile.config as TsConfigJson;

  const parsedCommandLine = ts.parseJsonConfigFileContent(
    tsconfig,
    ts.sys,
    currentDir,
  );

  if (parsedCommandLine.errors.length) {
    log.err(`Could not parse ${tsconfigFilepath}.`);
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
    sourcemap: true,

    // TODO: investigate incremental builds
    // incremental: true

    // TODO: figure out CJS vs ESM
    ...(isNode ? { format: 'cjs', platform: 'node' } : null),

    entryPoints,
    outdir: compilerOptions.outDir,
    plugins: [tsconfigPaths({ tsconfig })],
    tsconfig: tsconfigFilepath,
  });

  if (compilerOptions.declaration) {
    const { tsc } = await import('./tsc');

    await tsc(['--declaration', '--emitDeclarationOnly']);
  }
};
