import http from 'http';

import { isFunction, isIpPort, isObject } from '../utils/validation';

import { serveRequestListener, startServer } from './http';

// Express compatibility
interface FunctionConfig extends http.RequestListener {
  port?: number;
}

interface ObjectConfig {
  // Koa compatibility
  callback?: () => http.RequestListener;

  requestListener?: http.RequestListener;

  // Fastify compatibility
  server?: http.Server;

  default?: Promise<unknown>;
  port?: unknown;
}

const isConfig = (
  data: unknown,
): data is Promise<FunctionConfig> | Promise<ObjectConfig> =>
  isFunction(data) || isObject(data);

interface Args {
  availablePort?: number;
  entryPoint: unknown;
}

/**
 * Create an HTTP server that calls into an exported `http.RequestListener`.
 *
 * This supports Express and Koa applications out of the box.
 */
export const runRequestListener = async ({
  availablePort,
  entryPoint,
}: Args): Promise<void> => {
  if (!isConfig(entryPoint)) {
    // Assume an executable script with weird exports
    return;
  }

  let config: FunctionConfig | ObjectConfig = await entryPoint;

  if (typeof config === 'object' && isConfig(config.default)) {
    // Prefer `export default` over `export =`
    config = await config.default;
  }

  if (Object.keys(config).length === 0) {
    // Assume an executable script with no exports
    return;
  }

  const port = isIpPort(config.port) ? config.port : availablePort;

  // http.Server support
  if (typeof config !== 'function' && config instanceof http.Server) {
    return startServer(config, port);
  }

  // Fastify workaround
  if (
    typeof config !== 'function' &&
    config.server &&
    config.server instanceof http.Server
  ) {
    return startServer(config.server, port);
  }

  const requestListener =
    typeof config === 'function'
      ? config
      : (config.requestListener ?? config.callback?.());

  if (typeof requestListener !== 'function') {
    // Assume an executable script with non-request listener exports
    return;
  }

  return serveRequestListener(requestListener, port);
};
