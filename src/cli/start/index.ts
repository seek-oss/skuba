import path from 'path';

import getPort from 'get-port';
import parse from 'yargs-parser';

import { unsafeMapYargs } from '../../utils/args';
import { exec } from '../../utils/exec';
import {
  getEntryPointFromManifest,
  isBabelFromManifest,
} from '../../utils/manifest';

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
  };
};

export const start = async () => {
  const [args, port, isBabel] = await Promise.all([
    parseArgs(),
    getPort(),
    isBabelFromManifest(),
  ]);

  if (isBabel) {
    return exec(
      'nodemon',
      '--ext',
      ['.js', '.json', '.ts'].join(','),
      ...args.inspect,
      '--quiet',
      '--exec',
      'babel-node',
      '--extensions',
      ['.js', '.json', '.ts'].join(','),
      path.join(__dirname, 'http.js'),
      args.entryPoint,
      String(port),
    );
  }

  return exec(
    'ts-node-dev',
    ...args.inspect,
    '--respawn',
    '--transpile-only',
    path.join(__dirname, 'http'),
    args.entryPoint,
    String(port),
  );
};
