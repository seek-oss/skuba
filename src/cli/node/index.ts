import path from 'path';

import execa from 'execa';
import getPort from 'get-port';

import { parseRunArgs } from '../../utils/args.js';
import { createExec } from '../../utils/exec.js';
import { isIpPort } from '../../utils/validation.js';
import { getCustomConditions } from '../build/tsc.js';

export const longRunning = true;

export const node = async () => {
  const args = parseRunArgs(process.argv.slice(2));
  const customConditions = getCustomConditions();

  const uniqueConditions = [
    ...new Set([...(args.conditions ?? []), ...customConditions]),
  ];

  const availablePort = await getPort();

  const commonArgs = [
    ...args.node,
    ...uniqueConditions.map((condition) => `--conditions=${condition}`),
    '--env-file-if-exists',
    '.env',
  ];

  if (args.entryPoint) {
    const exec = createExec({
      env: {
        __SKUBA_ENTRY_POINT: args.entryPoint,
        __SKUBA_PORT: String(isIpPort(args.port) ? args.port : availablePort),
      },
    });

    return exec(
      'tsx',
      ...commonArgs,
      path.join(import.meta.dirname, '..', '..', 'wrapper', 'index.js'),
      ...args.script,
    );
  }

  return execa(
    new URL(import.meta.resolve('tsx/cli')).pathname,
    [
      ...commonArgs,
      '--import',
      // Unsure if bug or feature that this is needed, but tsx appears to not do anything typescript in the REPL without this!
      // Doesn't occur when just running the tsx binary directly 🧐
      new URL(import.meta.resolve('tsx/patch-repl')).pathname,
    ],
    {
      stdio: 'inherit',
    },
  );
};
