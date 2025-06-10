import path from 'path';

import execa from 'execa';
import getPort from 'get-port';

import { parseRunArgs } from '../../utils/args';
import { createExec } from '../../utils/exec';
import { isIpPort } from '../../utils/validation';

export const longRunning = true;

export const node = async () => {
  const args = parseRunArgs(process.argv.slice(2));

  const availablePort = await getPort();

  const commonArgs = [
    ...args.node,
    '--require',
    require.resolve('dotenv/config'),
    '--require',
    require.resolve('tsconfig-paths/register'),
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
      path.join(__dirname, '..', '..', 'wrapper', 'index.js'),
      ...args.script,
    );
  }

  return execa(
    require.resolve('tsx/cli'),
    [
      ...commonArgs,
      '--require',
      // Unsure if bug or feature that this is needed, but tsx appears to not do anything typescript in the REPL without this!
      // Doesn't occur when just running the tsx binary directly 🧐
      require.resolve('tsx/patch-repl'),
    ],
    {
      stdio: 'inherit',
    },
  );
};
