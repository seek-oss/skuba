/**
 * Wrapper around an entry point provided to `skuba node` or `skuba start`.
 *
 * Beyond simply loading the entry point, it supports the following features:
 *
 * - If you `export =` or `export default` an Express or Koa application,
 *   it will spin up a local HTTP server.
 */

import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';

import { handleCliError } from './utils/error';
import { log } from './utils/logging';

type Config = FunctionConfig | ObjectConfig;

// Express compatibility
interface FunctionConfig extends http.RequestListener {
  port?: number;
}

interface ObjectConfig {
  // Koa compatibility
  callback?: () => http.RequestListener;

  requestListener?: http.RequestListener;

  default?: unknown;
  port?: number;
}

const isConfig = (data: unknown): data is Config =>
  (typeof data === 'object' && data !== null) || typeof data === 'function';

const main = () => {
  if (process.argv.length < 4) {
    log.err('Missing arguments:', log.bold('entry-point'), log.bold('port'));
    process.exit(1);
  }

  const entryPoint = process.argv[2];

  const appPath = path.join(process.cwd(), entryPoint);

  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const appModule = require(appPath) as unknown;

  if (!isConfig(appModule)) {
    log.err('Invalid export from', log.bold(appPath));
    process.exit(1);
  }

  let config = appModule;

  // prefer `export default` over `export =`
  if (typeof config === 'object' && isConfig(config.default)) {
    config = config.default;
  }

  // assume an executable script with no exports
  if (Object.keys(config).length === 0) {
    return Promise.resolve();
  }

  const availablePort = Number(process.argv[3]) || undefined;

  const port = config.port ?? availablePort;

  const requestListener =
    typeof config === 'function'
      ? config
      : config.requestListener ?? config.callback?.();

  if (typeof requestListener === 'undefined') {
    return Promise.resolve();
  }

  const server = http.createServer(requestListener);

  return new Promise((resolve, reject) =>
    server
      .listen(port)
      .on('close', resolve)
      .on('error', reject)
      .on('listening', () => {
        const address = server.address() as AddressInfo;

        log.ok('listening on port', log.bold(address.port));
      }),
  );
};

main().catch(handleCliError);
