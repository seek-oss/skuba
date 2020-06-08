import path from 'path';

import getPort from 'get-port';

import { createExec } from '../../utils/exec';
import { getEntryPointFromManifest } from '../../utils/manifest';

const getEntryPoint = () => {
  const [entryPointArg] = process.argv.slice(2);

  return typeof entryPointArg === 'string'
    ? Promise.resolve(entryPointArg)
    : getEntryPointFromManifest();
};

export const start = async () => {
  const [entryPoint, port] = await Promise.all([getEntryPoint(), getPort()]);

  const exec = createExec({ pnp: true });

  return exec(
    'ts-node-dev',
    '--respawn',
    path.join(__dirname, 'http'),
    entryPoint,
    String(port),
  );
};
