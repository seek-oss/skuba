import type http from 'http';
import type { AddressInfo } from 'net';

import { log } from '../utils/logging.js';

/**
 * Returns a HTTP server wrapped in a promise
 *
 * This function resolves when the server is closed.
 */
export const startServer = (server: http.Server, port?: number) =>
  new Promise<void>((resolve, reject) =>
    server
      .listen(port)
      .on('close', resolve)
      .on('error', reject)
      .on('listening', () => {
        const address = server.address() as AddressInfo;

        log.ok('listening on port', log.bold(address.port));
      }),
  );
