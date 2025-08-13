import path from 'path';

import ts from 'typescript';

import { exec } from '../../utils/exec.js';
import { type Logger, log as logger } from '../../utils/logging.js';

import { parseTscArgs } from './args.js';

const DEFAULT_ARGS = ['--project', 'tsconfig.build.json'] as const;

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: ts.sys.getCurrentDirectory.bind(undefined),
  getNewLine: () => ts.sys.newLine,
};

const tsconfigCache = new Map<string, ts.ParsedCommandLine>();

export const tsc = async (args = process.argv.slice(2)) => {
  const tscArgs = parseTscArgs(args);

  // Build flag is incompatible with project flag.
  const defaultArgs = tscArgs.build || tscArgs.project ? [] : DEFAULT_ARGS;

  return exec('tsc', ...defaultArgs, ...args);
};

export const readTsBuildConfig = (
  args = process.argv.slice(2),
  log: Logger,
) => {
  const tscArgs = parseTscArgs(args);

  log.debug(
    log.bold(
      'tsconfig',
      ...(tscArgs.project ? ['--project', tscArgs.project] : []),
    ),
  );
  log.debug(tscArgs.pathname);

  const parsedConfig = readTsConfig({
    dir: tscArgs.dirname,
    fileName: tscArgs.basename,
    log,
  });

  if (parsedConfig?.errors.length) {
    log.err(`Could not parse ${tscArgs.basename}.`);
    log.subtle(ts.formatDiagnostics(parsedConfig.errors, formatHost));
    process.exitCode = 1;
    return;
  }

  return parsedConfig;
};

export const readTsConfig = ({
  dir,
  fileName,
  log,
  silentlyFail = false,
}: {
  dir: string;
  fileName: string;
  log: Logger;
  silentlyFail?: boolean;
}) => {
  const pathName = path.join(dir, fileName);

  const cachedConfig = tsconfigCache.get(pathName);

  if (cachedConfig) {
    return cachedConfig;
  }

  const tsconfigFile = ts.findConfigFile(
    dir,
    ts.sys.fileExists.bind(undefined),
    fileName,
  );
  if (!tsconfigFile) {
    if (!silentlyFail) {
      log.err(`Could not find ${pathName}.`);
      process.exitCode = 1;
    }
    return;
  }

  const readConfigFile = ts.readConfigFile(
    tsconfigFile,
    ts.sys.readFile.bind(undefined),
  );
  if (readConfigFile.error) {
    if (!silentlyFail) {
      log.err(`Could not read ${pathName}.`);
      log.subtle(ts.formatDiagnostic(readConfigFile.error, formatHost));
      process.exitCode = 1;
    }
    return;
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    readConfigFile.config,
    ts.sys,
    dir,
  );

  tsconfigCache.set(pathName, parsedConfig);

  return parsedConfig;
};

export const getCustomConditions = () => {
  const parsedConfig = readTsConfig({
    dir: process.cwd(),
    fileName: 'tsconfig.json',
    log: logger,
    silentlyFail: true,
  });

  if (!parsedConfig) {
    return [];
  }

  return parsedConfig.options.customConditions ?? [];
};
