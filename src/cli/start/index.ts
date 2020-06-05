import path from 'path';

import getPort from 'get-port';

import { handleCliError } from '../../utils/error';
import { exec } from '../../utils/exec';
import { getEntryPointFromManifest } from '../../utils/manifest';

const getEntryPoint = () => {
  const [entryPointArg] = process.argv.slice(2);

  return typeof entryPointArg === 'string'
    ? Promise.resolve(entryPointArg)
    : getEntryPointFromManifest();
};

const start = async () => {
  const [entryPoint, port] = await Promise.all([getEntryPoint(), getPort()]);

  return exec(
    'ts-node-dev',
    '--respawn',
    path.join(__dirname, 'http'),
    entryPoint,
    String(port),
  );
};

start().catch(handleCliError);
