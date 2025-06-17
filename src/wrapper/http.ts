import http from 'http';
import type { AddressInfo } from 'net';
import util from 'util';

import { log } from '../utils/logging.js';

/**
 * Create an HTTP request listener based on the supplied function.
 *
 * - The request body is JSON parsed and passed into the function as parameters.
 * - The function's return value is JSON stringified into the response body.
 */
export const createRequestListenerFromFunction =
  (fn: (...args: unknown[]) => Promise<unknown>): http.RequestListener =>
  async (req, res) => {
    const writeResponse = (response: unknown) =>
      new Promise<void>((resolve, reject) =>
        response === undefined
          ? res.end(resolve)
          : res.write(response, 'utf8', (err) =>
              err ? reject(err) : res.end(resolve),
            ),
      );

    try {
      const requestBody = await new Promise<string>((resolve, reject) => {
        const data: Buffer[] = [];

        req
          .on('data', (chunk: Buffer) => data.push(chunk))
          .on('end', () => resolve(Buffer.concat(data).toString()))
          .on('error', (err) => reject(err));
      });

      // Treat an empty body as no arguments
      const jsonRequest: unknown = requestBody ? JSON.parse(requestBody) : [];

      // Pass a non-array request body as the first parameter
      const args: unknown[] = Array.isArray(jsonRequest)
        ? jsonRequest
        : [jsonRequest];

      const response: unknown = await fn(...args);

      res.writeHead(200, { 'Content-Type': 'application/json' });

      await writeResponse(JSON.stringify(response, null, 2));
    } catch (err) {
      res.writeHead(500);

      await writeResponse(util.inspect(err));
    }
  };

/**
 * Create a HTTP server based on the supplied `http.RequestListener`.
 *
 * This function resolves when the server is closed.
 */
export const serveRequestListener = (
  requestListener: http.RequestListener,
  port?: number,
) => {
  const server = http.createServer(requestListener);
  return startServer(server, port);
};

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
