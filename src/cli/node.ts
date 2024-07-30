import path from 'path';

import getPort from 'get-port';

import { parseRunArgs } from '../utils/args';
import { createExec } from '../utils/exec';
import { isIpPort } from '../utils/validation';

export const longRunning = true;

export const node = async () => {
  const args = parseRunArgs(process.argv.slice(2));

  const availablePort = await getPort();

  if (args.entryPoint) {
    const exec = createExec({
      env: {
        __SKUBA_ENTRY_POINT: args.entryPoint,
        __SKUBA_PORT: String(isIpPort(args.port) ? args.port : availablePort),
      },
    });

    return exec(
      'tsx',
      ...args.node,
      '--require',
      'dotenv/config',
      '--require',
      'tsconfig-paths/register',
      // Override dangerously warn-only default on Node.js <15 so that we
      // predictably return a non-zero exit code on an unhandled rejection.
      '--unhandled-rejections=throw',
      path.join(__dirname, '..', 'wrapper'),
      ...args.script,
    );
  }

  // @ts-expect-error -- untyped
  return import('tsx/cli');
};
