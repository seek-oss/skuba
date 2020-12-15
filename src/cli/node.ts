import path from 'path';

import getPort from 'get-port';
import parse from 'yargs-parser';

import { unsafeMapYargs } from '../utils/args';
import { createExec } from '../utils/exec';
import { isBabelFromManifest } from '../utils/manifest';
import { isIpPort } from '../utils/validation';

const parseArgs = () => {
  const {
    _: [entryPointArg],
    ...yargs
  } = parse(process.argv.slice(2));

  const entryPoint = typeof entryPointArg === 'string' ? entryPointArg : null;

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

export const node = async () => {
  const args = parseArgs();

  const [availablePort, isBabel] = await Promise.all([
    getPort(),
    isBabelFromManifest(),
  ]);

  const exec = createExec({
    env: isBabel ? undefined : { __SKUBA_REGISTER_MODULE_ALIASES: '1' },
  });

  if (isBabel) {
    return exec(
      'babel-node',
      ...args.inspect,
      '--extensions',
      ['.js', '.json', '.ts'].join(','),
      '--require',
      path.posix.join('skuba', 'lib', 'register'),
      ...(args.entryPoint === null
        ? []
        : [
            path.join(__dirname, '..', 'wrapper.js'),
            args.entryPoint,
            String(isIpPort(args.port) ? args.port : availablePort),
          ]),
    );
  }

  return exec(
    'ts-node',
    ...args.inspect,
    '--require',
    path.posix.join('skuba', 'lib', 'register'),
    '--transpile-only',
    ...(args.entryPoint === null
      ? []
      : [
          path.join(__dirname, '..', 'wrapper'),
          args.entryPoint,
          String(isIpPort(args.port) ? args.port : availablePort),
        ]),
  );
};
