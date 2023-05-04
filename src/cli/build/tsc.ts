import ts from 'typescript';

import { exec } from '../../utils/exec';
import type { Logger } from '../../utils/logging';

import { parseTscArgs } from './args';

const DEFAULT_ARGS = ['--project', 'tsconfig.build.json'] as const;

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: ts.sys.getCurrentDirectory.bind(undefined),
  getNewLine: () => ts.sys.newLine,
};

export const tsc = async (args = process.argv.slice(2)) => {
  const tscArgs = parseTscArgs(args);

  // Build flag is incompatible with project flag.
  const defaultArgs = tscArgs.build || tscArgs.project ? [] : DEFAULT_ARGS;

  return exec('tsc', ...defaultArgs, ...args);
};

export const readTsconfig = (args = process.argv.slice(2), log: Logger) => {
  const tscArgs = parseTscArgs(args);

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

  return parsedCommandLine;
};
