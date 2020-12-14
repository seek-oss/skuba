import path from 'path';

import getPort from 'get-port';
import parse from 'yargs-parser';

import { unsafeMapYargs } from '../utils/args';
import { createExec } from '../utils/exec';
import {
  getEntryPointFromManifest,
  isBabelFromManifest,
} from '../utils/manifest';

const parseArgs = async () => {
  const {
    _: [entryPointArg],
    ...yargs
  } = parse(process.argv.slice(2));

  const entryPoint =
    typeof entryPointArg === 'string'
      ? entryPointArg
      : await getEntryPointFromManifest();

  const inspect = unsafeMapYargs({
    inspect: yargs.inspect as unknown,
    'inspect-brk': yargs['inspect-brk'] as unknown,
  });

  return {
    entryPoint,
    inspect,
    port: Number(yargs.port) || undefined,
  };
};

export const start = async () => {
  const [args, availablePort, isBabel] = await Promise.all([
    parseArgs(),
    getPort(),
    isBabelFromManifest(),
  ]);

  const execProcess = createExec({
    env: isBabel ? undefined : { __SKUBA_REGISTER_MODULE_ALIASES: '1' },
  });

  if (isBabel) {
    return execProcess(
      'nodemon',
      '--ext',
      ['.js', '.json', '.ts'].join(','),
      ...args.inspect,
      '--quiet',
      '--exec',
      'babel-node',
      '--extensions',
      ['.js', '.json', '.ts'].join(','),
      '--require',
      path.posix.join('skuba', 'lib', 'register'),
      path.join(__dirname, '..', 'wrapper.js'),
      args.entryPoint,
      String(args.port ?? availablePort),
    );
  }

  return execProcess(
    'ts-node-dev',
    ...args.inspect,
    '--require',
    path.posix.join('skuba', 'lib', 'register'),
    '--respawn',
    '--transpile-only',
    path.join(__dirname, '..', 'wrapper'),
    args.entryPoint,
    String(args.port ?? availablePort),
  );
};
