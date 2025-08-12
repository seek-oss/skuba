import path from 'path';

import getPort from 'get-port';

import { parseRunArgs } from '../../utils/args.js';
import { createExec } from '../../utils/exec.js';
import { getEntryPointFromManifest } from '../../utils/manifest.js';
import { isIpPort } from '../../utils/validation.js';

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
    '--clear-screen=false',
    ...args.node,
    '--env-file-if-exists',
    '.env',
    '--require',
    'tsconfig-paths/register',
    path.join(__dirname, '..', '..', 'wrapper', 'index.js'),
    ...args.script,
  );
};
