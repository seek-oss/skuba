import http from 'http';
import { AddressInfo } from 'net';

import { serializeError } from 'serialize-error';

import { log } from '../utils/logging';

/**
 * Create an HTTP request listener based on the supplied function.
 *
 * - The request body is JSON parsed and passed into the function as parameters.
 * - The function's return value is JSON stringified into the response body.
 */
export const createRequestListenerFromFunction =
  (
    fn: (...args: unknown[]) => unknown | Promise<unknown>,
  ): http.RequestListener =>
  async (req, res) => {
    const writeJsonResponse = (statusCode: number, jsonResponse: unknown) =>
      new Promise<void>((resolve, reject) =>
        res
          .writeHead(statusCode, { 'Content-Type': 'application/json' })
          .write(JSON.stringify(jsonResponse, null, 2), 'utf8', (err) =>
            err ? reject(err) : res.end(resolve),
          ),
      );

    try {
      const requestBody = await new Promise<string>((resolve, reject) => {
        let data = '';

        req
          .on('data', (chunk) => (data += chunk))
          .on('end', () => resolve(data))
          .on('error', (err) => reject(err));
      });

      const jsonRequest: unknown = JSON.parse(requestBody);

      // Pass a non-array request body as the first parameter
      const args = Array.isArray(jsonRequest) ? jsonRequest : [jsonRequest];

      const response: unknown = await fn(...args);

      await writeJsonResponse(200, response);
    } catch (err) {
      await writeJsonResponse(500, serializeError(err));
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

  return new Promise<void>((resolve, reject) =>
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
