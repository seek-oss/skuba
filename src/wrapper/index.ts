/**
 * Wrapper around an entry point provided to `skuba node` or `skuba start`.
 *
 * Beyond simply loading the entry point, it supports the following features:
 *
 * - If you set the entry point to an exported function like `src/app#handler`,
 *   it will spin up a local HTTP server that calls into the function.
 *
 * - If you `export =` or `export default` an Express or Koa application,
 *   it will spin up a local HTTP server based on the request listener.
 */

import path from 'path';

import { handleCliError } from '../utils/error';
import { log } from '../utils/logging';

import { runFunctionHandler } from './functionHandler';
import { runRequestListener } from './requestListener';

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    log.err('Missing arguments:', log.bold('entry-point'), log.bold('port'));
    process.exit(1);
  }

  const [rawEntryPoint, rawPort] = args;

  const availablePort = Number(rawPort) || undefined;

  // Support exported function targeting, e.g. `src/module.ts#callMeMaybe`
  const [modulePath, functionName] = path
    .join(process.cwd(), rawEntryPoint)
    .split('#', 2);

  // Load entry point as module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const entryPoint = require(modulePath) as unknown;

  return functionName
    ? runFunctionHandler({ availablePort, entryPoint, functionName })
    : runRequestListener({ availablePort, entryPoint });
};

main().catch(handleCliError);
