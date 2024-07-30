import path from 'path';

import getPort from 'get-port';

import { parseRunArgs } from '../utils/args';
import { createExec } from '../utils/exec';
import { getEntryPointFromManifest } from '../utils/manifest';
import { isIpPort } from '../utils/validation';

export const start = async () => {
  const [args, availablePort] = await Promise.all([
    parseRunArgs(process.argv.slice(2)),
    getPort(),
  ]);

  args.entryPoint ??= await getEntryPointFromManifest();

  const execProcess = createExec({
    env: {
      __SKUBA_ENTRY_POINT: args.entryPoint,
      __SKUBA_PORT: String(isIpPort(args.port) ? args.port : availablePort),
    },
  });

  return execProcess(
    'tsx',
    'watch',
    ...args.node,
    '--require',
    'dotenv/config',
    '--require',
    'tsconfig-paths/register',
    '--respawn',
    '--transpile-only',
    path.join(__dirname, '..', 'wrapper'),
    ...args.script,
  );
};
