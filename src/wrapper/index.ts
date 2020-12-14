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

import { handleCliError } from '../utils/error';
import { log } from '../utils/logging';

import { main } from './main';

const args = process.argv.slice(2);

if (args.length < 2) {
  throw new Error(
    `Missing arguments: ${log.bold('entry-point')} ${log.bold('port')}`,
  );
}

const [rawEntryPoint, rawPort] = args;

main(rawEntryPoint, rawPort).catch(handleCliError);
