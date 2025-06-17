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

import { handleCliError } from '../utils/error.js';
import { log } from '../utils/logging.js';

import { main } from './main.js';

const ENTRY_POINT_VAR = '__SKUBA_ENTRY_POINT';
const PORT_VAR = '__SKUBA_PORT';

const rawEntryPoint = process.env[ENTRY_POINT_VAR];
if (!rawEntryPoint) {
  throw new Error(`Missing environment variable: ${log.bold(ENTRY_POINT_VAR)}`);
}

const rawPort = process.env[PORT_VAR];
if (!rawPort) {
  throw new Error(`Missing environment variable: ${log.bold(PORT_VAR)}`);
}

main(rawEntryPoint, rawPort).catch(handleCliError);
