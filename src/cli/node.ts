import path from 'path';

import getPort from 'get-port';
import * as tsNode from 'ts-node';

import { parseRunArgs } from '../utils/args';
import { createExec } from '../utils/exec';
import { isIpPort } from '../utils/validation';

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

    // Run a script with plain `node` to support inspector options.
    // https://github.com/TypeStrong/ts-node#programmatic
    return exec(
      'node',
      ...args.node,
      '--require',
      path.posix.join('skuba', 'lib', 'register'),
      '--require',
      path.posix.join('ts-node', 'register', 'transpile-only'),
      path.join(__dirname, '..', 'wrapper'),
      ...args.script,
    );
  }

  // REPL with `ts-node` to support import statements.
  return tsNode
    .createRepl({
      service: tsNode.register({
        require: [path.join(__dirname, '..', 'register')],
        transpileOnly: true,
      }),
    })
    .start();
};
