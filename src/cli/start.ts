import path from 'path';

import getPort from 'get-port';

import { parseRunArgs } from '../utils/args';
import { createExec } from '../utils/exec';
import {
  getEntryPointFromManifest,
  isBabelFromManifest,
} from '../utils/manifest';
import { isIpPort } from '../utils/validation';

export const start = async () => {
  const [args, availablePort, isBabel] = await Promise.all([
    parseRunArgs(process.argv.slice(2)),
    getPort(),
    isBabelFromManifest(),
  ]);

  if (!args.entryPoint) {
    args.entryPoint = await getEntryPointFromManifest();
  }

  const execProcess = createExec({
    env: isBabel
      ? undefined
      : {
          __SKUBA_ENTRY_POINT: args.entryPoint,
          __SKUBA_PORT: String(isIpPort(args.port) ? args.port : availablePort),
          __SKUBA_REGISTER_MODULE_ALIASES: '1',
        },
  });

  if (isBabel) {
    return execProcess(
      'nodemon',
      '--ext',
      ['.js', '.json', '.ts'].join(','),
      ...args.node,
      '--quiet',
      '--exec',
      'babel-node',
      '--extensions',
      ['.js', '.json', '.ts'].join(','),
      '--require',
      path.posix.join('skuba', 'lib', 'register'),
      path.join(__dirname, '..', 'wrapper.js'),
      ...args.script,
    );
  }

  return execProcess(
    'ts-node-dev',
    ...args.node,
    '--require',
    path.posix.join('skuba', 'lib', 'register'),
    '--respawn',
    '--transpile-only',
    path.join(__dirname, '..', 'wrapper'),
    ...args.script,
  );
};
