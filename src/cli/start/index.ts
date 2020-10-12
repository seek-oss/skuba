import path from 'path';

import getPort from 'get-port';

import { exec } from '../../utils/exec';
import {
  getEntryPointFromManifest,
  isBabelFromManifest,
} from '../../utils/manifest';

const getEntryPoint = () => {
  const [entryPointArg] = process.argv.slice(2);

  return typeof entryPointArg === 'string'
    ? Promise.resolve(entryPointArg)
    : getEntryPointFromManifest();
};

export const start = async () => {
  const [entryPoint, port, isBabel] = await Promise.all([
    getEntryPoint(),
    getPort(),
    isBabelFromManifest(),
  ]);

  if (isBabel) {
    return exec(
      'nodemon',
      '--ext',
      ['.js', '.json', '.ts'].join(','),
      '--quiet',
      '--exec',
      'babel-node',
      '--extensions',
      ['.js', '.json', '.ts'].join(','),
      path.join(__dirname, 'http.js'),
      entryPoint,
      String(port),
    );
  }

  return exec(
    'ts-node-dev',
    '--respawn',
    '--transpile-only',
    path.join(__dirname, 'http'),
    entryPoint,
    String(port),
  );
};
